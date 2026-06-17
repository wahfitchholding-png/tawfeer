import type { Platform } from '@/types'
import { prisma } from '@/lib/prisma'

export interface DiscoveredRestaurant {
  name: string
  cuisine: string
  platform: Platform
  webUrl: string
  platformId: string
}

const BROWSER_ARGS = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'

async function makeBrowser(lat: number, lng: number) {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ headless: true, args: BROWSER_ARGS })
  const context = await browser.newContext({
    geolocation: { latitude: lat, longitude: lng },
    permissions: ['geolocation'],
    userAgent: MOBILE_UA,
    viewport: { width: 390, height: 844 },
    locale: 'en-AE',
    timezoneId: 'Asia/Dubai',
  })
  return { browser, context }
}

// ─── TALABAT ────────────────────────────────────────────────────────────────
// Pure HTTP fetch — no Playwright needed. Talabat uses SSR with __NEXT_DATA__
// and paginates via ?page=N. We fetch every page until hasNextPage is false.

async function scrapeTalabat(): Promise<DiscoveredRestaurant[]> {
  const results: DiscoveredRestaurant[] = []
  const seen = new Set<string>()
  let page = 1
  let hasNextPage = true

  while (hasNextPage && page <= 100) {
    try {
      const res = await fetch(`https://www.talabat.com/uae/restaurants?page=${page}`, {
        headers: {
          'User-Agent': MOBILE_UA,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-AE,en;q=0.9',
        },
      })
      if (!res.ok) break
      const html = await res.text()
      const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/)
      if (!match) break

      const data = JSON.parse(match[1])
      const p = data?.props?.pageProps
      if (!p) break

      hasNextPage = p.hasNextPage === true
      const restaurants: Array<{ id: number; name: string; slug: string; cuisines: string }> = p.restaurants || []

      for (const r of restaurants) {
        if (!r.name?.trim() || !r.slug) continue
        const platformId = String(r.id)
        if (seen.has(platformId)) continue
        seen.add(platformId)

        const cuisine = typeof r.cuisines === 'string'
          ? r.cuisines.split(',')[0].trim()
          : (r.cuisines as unknown as Array<{ name: string }>)?.[0]?.name || 'Restaurant'

        results.push({
          name: r.name.trim(),
          cuisine: cuisine || 'Restaurant',
          platform: 'TALABAT',
          webUrl: `https://www.talabat.com/uae/${r.slug}`,
          platformId,
        })
      }

      console.log(`[TALABAT] Page ${page}: +${restaurants.length} (total ${results.length}), hasNextPage=${hasNextPage}`)
      page++
    } catch (err) {
      console.error(`[TALABAT] Page ${page} failed:`, err instanceof Error ? err.message : err)
      break
    }
  }

  console.log(`[TALABAT] Scraped ${results.length} restaurants across ${page - 1} pages`)
  return results
}

// ─── NOON FOOD ───────────────────────────────────────────────────────────────
// Playwright per Dubai zone. Noon uses client-side rendering per zone.
// Restaurant links: /outlet/[ID]

const NOON_DUBAI_ZONES = [
  'Dubai Marina', 'Downtown', 'Business Bay', 'Deira', 'Karama',
  'Dubai Festival City', 'Barsha Heights', 'Umm Suqeim', 'The Greens',
  'Discovery Gardens', 'Dubai Silicon Oasis', 'Dubai Sports City',
]

async function scrapeNoonZone(zone: string, lat: number, lng: number): Promise<DiscoveredRestaurant[]> {
  const { browser, context } = await makeBrowser(lat, lng)
  const results: DiscoveredRestaurant[] = []

  try {
    const page = await context.newPage()
    await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf,mp4,webp,avif}', r => r.abort())

    const url = `https://food.noon.com/zone/${encodeURIComponent(zone)}/`
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(5000)

    // Scroll to load all restaurants
    let emptyScrolls = 0
    let prevCount = 0
    for (let i = 0; i < 20; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(2000)
      const currentCount = await page.evaluate(() =>
        document.querySelectorAll('a[href*="/outlet/"]').length
      )
      if (currentCount === prevCount) { emptyScrolls++; if (emptyScrolls >= 2) break }
      else { emptyScrolls = 0; prevCount = currentCount }
    }

    // Extract restaurants
    const extracted = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('a[href*="/outlet/"]'))
      return cards.map(a => {
        const el = a as HTMLAnchorElement
        const nameEl = el.querySelector('h3, h2, [class*="name" i], [class*="title" i]')
          || el.closest('[class*="card" i], [class*="item" i], [class*="vendor" i]')?.querySelector('h3, h2, p')
        const cuisineEl = el.querySelector('[class*="cuisine" i], [class*="category" i], p')
        const name = nameEl?.textContent?.trim() || ''
        const cuisine = cuisineEl?.textContent?.trim() || ''
        const id = el.href.match(/\/outlet\/([A-Z0-9]+)/)?.[1] || ''
        return { href: el.href, name, cuisine, id }
      }).filter(r => r.id && r.name.length > 1)
    })

    const seen = new Set<string>()
    for (const r of extracted) {
      if (seen.has(r.id)) continue
      seen.add(r.id)
      results.push({
        name: r.name.split('\n')[0].trim(),
        cuisine: r.cuisine.split('\n')[0].trim() || 'Restaurant',
        platform: 'NOON_FOOD',
        webUrl: r.href,
        platformId: r.id,
      })
    }
    console.log(`[NOON_FOOD] Zone "${zone}": ${results.length} restaurants`)
  } catch (err) {
    console.error(`[NOON_FOOD] Zone "${zone}" failed:`, err instanceof Error ? err.message : err)
  } finally {
    await browser.close()
  }
  return results
}

// ─── DELIVEROO ───────────────────────────────────────────────────────────────
// Playwright visiting Dubai neighborhoods. Deliveroo uses /en/restaurants/dubai/[area]

const DELIVEROO_DUBAI_AREAS = [
  'jumeirah', 'jumeirah-1', 'jumeirah-beach-residence', 'jbr',
  'business-bay', 'difc', 'downtown-dubai', 'bur-dubai', 'deira',
  'al-barsha', 'mirdif', 'karama', 'al-nahda', 'international-city',
]

async function scrapeDeliveroo(lat: number, lng: number): Promise<DiscoveredRestaurant[]> {
  const results: DiscoveredRestaurant[] = []
  const seen = new Set<string>()

  for (const area of DELIVEROO_DUBAI_AREAS) {
    const { browser, context } = await makeBrowser(lat, lng)
    try {
      const captured: DiscoveredRestaurant[] = []

      context.on('response', async (response) => {
        try {
          if (!response.url().includes('deliveroo') && !response.url().includes('roocdn')) return
          if (response.status() !== 200) return
          const ct = response.headers()['content-type'] ?? ''
          if (!ct.includes('json')) return
          const body = await response.json()
          // Deliveroo API shapes
          const restaurants: unknown[] =
            body?.data?.restaurants || body?.restaurants || body?.results || body?.items || []
          if (!Array.isArray(restaurants) || restaurants.length === 0) return
          for (const item of restaurants) {
            const r = item as Record<string, unknown>
            const name = String(r.name ?? r.restaurantName ?? '')
            const slug = String(r.slug ?? r.uname ?? r.id ?? '')
            if (!name || !slug) continue
            captured.push({
              name,
              cuisine: String((r.cuisines as string[])?.[0] ?? r.type ?? 'Restaurant'),
              platform: 'DELIVEROO',
              webUrl: slug.startsWith('http') ? slug : `https://deliveroo.ae/en/menu/dubai/${slug}`,
              platformId: String(r.id ?? slug),
            })
          }
        } catch { /* ignore */ }
      })

      const page = await context.newPage()
      await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf,mp4,webp,avif}', r => r.abort())
      const url = `https://deliveroo.ae/en/restaurants/dubai/${area}`
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(4000)

      // Check if area is served
      const notThere = await page.evaluate(() =>
        document.body.innerText.includes("not there yet") || document.body.innerText.includes("not available")
      )
      if (notThere) { await browser.close(); continue }

      // Scroll to load more
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
        await page.waitForTimeout(2000)
      }

      // DOM fallback
      if (captured.length === 0) {
        const fromDom = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a[href*="/menu/"]'))
          return links.map(a => {
            const el = a as HTMLAnchorElement
            const name = el.querySelector('h3, h2, [class*="name" i]')?.textContent?.trim() || ''
            const slug = el.href.match(/\/menu\/[^/]+\/([^/?#]+)/)?.[1] || ''
            return { href: el.href, name, slug }
          }).filter(r => r.slug && r.name)
        })
        for (const r of fromDom) {
          captured.push({
            name: r.name,
            cuisine: 'Restaurant',
            platform: 'DELIVEROO',
            webUrl: r.href,
            platformId: r.slug,
          })
        }
      }

      for (const r of captured) {
        if (!seen.has(r.platformId)) {
          seen.add(r.platformId)
          results.push(r)
        }
      }
      if (captured.length > 0) console.log(`[DELIVEROO] Area "${area}": ${captured.length} restaurants`)
    } catch (err) {
      console.error(`[DELIVEROO] Area "${area}" failed:`, err instanceof Error ? err.message : err)
    } finally {
      await browser.close()
    }
  }

  console.log(`[DELIVEROO] Total: ${results.length} restaurants`)
  return results
}

// ─── CAREEM ──────────────────────────────────────────────────────────────────

async function scrapeCareem(lat: number, lng: number): Promise<DiscoveredRestaurant[]> {
  const { browser, context } = await makeBrowser(lat, lng)
  const results: DiscoveredRestaurant[] = []
  const seen = new Set<string>()

  try {
    context.on('response', async (response) => {
      try {
        const url = response.url()
        if (!url.includes('careem') && !url.includes('uber')) return
        if (response.status() !== 200) return
        if (!(response.headers()['content-type'] ?? '').includes('json')) return
        const body = await response.json()
        const restaurants: unknown[] =
          body?.data?.feedItems || body?.data?.vendors || body?.feedItems ||
          body?.restaurants || body?.vendors || body?.results || []
        if (!Array.isArray(restaurants) || restaurants.length === 0) return
        for (const item of restaurants) {
          const r = item as Record<string, unknown>
          const store = (r.store ?? r.restaurant ?? r) as Record<string, unknown>
          const name = String(store.title ?? store.name ?? r.title ?? r.name ?? '')
          const id = String(store.uuid ?? store.id ?? r.uuid ?? r.id ?? '')
          if (!name || !id || name.length < 2) continue
          const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
          if (!seen.has(id)) {
            seen.add(id)
            results.push({
              name,
              cuisine: String((store.categories as string[])?.[0] ?? store.category ?? 'Restaurant'),
              platform: 'CAREEM',
              webUrl: `https://www.careem.com/en-ae/food/restaurant/${slug}`,
              platformId: id,
            })
          }
        }
      } catch { /* ignore */ }
    })

    const page = await context.newPage()
    await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf,mp4,webp,avif}', r => r.abort())
    await page.goto(`https://www.careem.com/en-ae/food/`, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(6000)

    let emptyScrolls = 0
    let prevCount = results.length
    for (let i = 0; i < 25; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(2500)
      if (results.length === prevCount) { emptyScrolls++; if (emptyScrolls >= 2) break }
      else { emptyScrolls = 0; prevCount = results.length }
    }

    // DOM fallback
    if (results.length === 0) {
      const fromDom = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href*="/food/restaurant/"], a[href*="/food/store/"]'))
          .map(a => {
            const el = a as HTMLAnchorElement
            const name = el.querySelector('h3, h2, [class*="name" i], span')?.textContent?.trim() || el.textContent?.trim() || ''
            const slug = el.href.split('/').pop() || ''
            return { href: el.href, name, slug }
          }).filter(r => r.name && r.slug)
      })
      for (const r of fromDom) {
        if (!seen.has(r.slug)) {
          seen.add(r.slug)
          results.push({ name: r.name, cuisine: 'Restaurant', platform: 'CAREEM', webUrl: r.href, platformId: r.slug })
        }
      }
    }
    console.log(`[CAREEM] ${results.length} restaurants`)
  } catch (err) {
    console.error('[CAREEM] Failed:', err instanceof Error ? err.message : err)
  } finally {
    await browser.close()
  }
  return results
}

// ─── KEETA ───────────────────────────────────────────────────────────────────
// Keeta food delivery in UAE — try multiple known domains

async function scrapeKeeta(lat: number, lng: number): Promise<DiscoveredRestaurant[]> {
  const { browser, context } = await makeBrowser(lat, lng)
  const results: DiscoveredRestaurant[] = []
  const seen = new Set<string>()

  try {
    context.on('response', async (response) => {
      try {
        if (response.status() !== 200) return
        if (!(response.headers()['content-type'] ?? '').includes('json')) return
        const body = await response.json()
        const restaurants: unknown[] =
          body?.data?.restaurants || body?.restaurants || body?.vendors ||
          body?.data?.vendors || body?.results || body?.items || []
        if (!Array.isArray(restaurants) || restaurants.length === 0) return
        for (const item of restaurants) {
          const r = item as Record<string, unknown>
          const name = String(r.name ?? r.restaurantName ?? r.title ?? '')
          const id = String(r.id ?? r.restaurantId ?? r.uuid ?? '')
          const slug = String(r.slug ?? r.urlSlug ?? id)
          if (!name || !id || name.length < 2) continue
          if (!seen.has(id)) {
            seen.add(id)
            results.push({
              name,
              cuisine: String((r.categories as string[])?.[0] ?? r.category ?? 'Restaurant'),
              platform: 'KEETA',
              webUrl: `https://www.keeta.ae/restaurant/${slug}`,
              platformId: id,
            })
          }
        }
      } catch { /* ignore */ }
    })

    const page = await context.newPage()
    await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf,mp4,webp,avif}', r => r.abort())

    // Try multiple Keeta UAE domains
    const urls = [
      'https://www.keeta.ae/',
      'https://keeta.ae/restaurants',
      'https://app.keeta.ae/',
    ]
    for (const url of urls) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
        await page.waitForTimeout(4000)
        let emptyScrolls = 0, prevCount = results.length
        for (let i = 0; i < 15; i++) {
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
          await page.waitForTimeout(2000)
          if (results.length === prevCount) { emptyScrolls++; if (emptyScrolls >= 2) break }
          else { emptyScrolls = 0; prevCount = results.length }
        }
        if (results.length > 0) break
      } catch { /* try next URL */ }
    }
    console.log(`[KEETA] ${results.length} restaurants`)
  } catch (err) {
    console.error('[KEETA] Failed:', err instanceof Error ? err.message : err)
  } finally {
    await browser.close()
  }
  return results
}

// ─── MAIN ENTRY POINT ────────────────────────────────────────────────────────

export async function discoverRestaurantsAtLocation(lat: number, lng: number): Promise<number> {
  console.log(`[DISCOVER] Starting at ${lat}, ${lng}`)

  // Talabat runs first (pure HTTP, fast, gets everything)
  let totalStored = 0

  try {
    console.log('[DISCOVER] Scraping Talabat (HTTP pagination)...')
    const talabat = await scrapeTalabat()
    totalStored += await storeDiscoveredRestaurants(talabat, lat, lng)
  } catch (err) { console.error('[DISCOVER] Talabat failed:', err) }

  // Noon Food: scrape the nearest 4 Dubai zones sequentially
  const noonZones = NOON_DUBAI_ZONES.slice(0, 4)
  for (const zone of noonZones) {
    try {
      console.log(`[DISCOVER] Scraping Noon Food zone: ${zone}`)
      const noon = await scrapeNoonZone(zone, lat, lng)
      totalStored += await storeDiscoveredRestaurants(noon, lat, lng)
    } catch (err) { console.error(`[DISCOVER] Noon zone ${zone} failed:`, err) }
  }

  // Deliveroo
  try {
    console.log('[DISCOVER] Scraping Deliveroo...')
    const deliveroo = await scrapeDeliveroo(lat, lng)
    totalStored += await storeDiscoveredRestaurants(deliveroo, lat, lng)
  } catch (err) { console.error('[DISCOVER] Deliveroo failed:', err) }

  // Careem
  try {
    console.log('[DISCOVER] Scraping Careem...')
    const careem = await scrapeCareem(lat, lng)
    totalStored += await storeDiscoveredRestaurants(careem, lat, lng)
  } catch (err) { console.error('[DISCOVER] Careem failed:', err) }

  // Keeta
  try {
    console.log('[DISCOVER] Scraping Keeta...')
    const keeta = await scrapeKeeta(lat, lng)
    totalStored += await storeDiscoveredRestaurants(keeta, lat, lng)
  } catch (err) { console.error('[DISCOVER] Keeta failed:', err) }

  console.log(`[DISCOVER] Complete — stored ${totalStored} total`)
  return totalStored
}

// ─── STORAGE ─────────────────────────────────────────────────────────────────

async function storeDiscoveredRestaurants(
  restaurants: DiscoveredRestaurant[],
  userLat: number,
  userLng: number
): Promise<number> {
  let stored = 0
  const seen = new Set<string>()

  for (const r of restaurants) {
    const key = `${r.platform}:${r.platformId}`
    if (seen.has(key) || !r.name.trim()) continue
    seen.add(key)

    try {
      // Match existing restaurant by name (first word, case-insensitive)
      const nameFirst = r.name.split(' ')[0]
      const existing = await prisma.restaurant.findFirst({
        where: { name: { contains: nameFirst, mode: 'insensitive' } },
      })

      let restaurantId: string
      if (existing) {
        restaurantId = existing.id
      } else {
        const slugBase = r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        const slugSuffix = r.platformId.slice(-6).replace(/[^a-z0-9]/g, '')
        const slug = `${slugBase}-${slugSuffix}`.slice(0, 60)

        const restaurant = await prisma.restaurant.upsert({
          where: { slug },
          update: {},
          create: {
            name: r.name,
            slug,
            category: r.cuisine,
            lat: userLat,
            lng: userLng,
            isActive: true,
          },
        })
        restaurantId = restaurant.id
      }

      await prisma.platformRestaurantLink.upsert({
        where: { restaurantId_platform: { restaurantId, platform: r.platform } },
        update: {
          deepLinkUrl: r.webUrl,
          webUrl: r.webUrl,
          platformRestaurantId: r.platformId,
          isAvailable: true,
          updatedAt: new Date(),
        },
        create: {
          restaurantId,
          platform: r.platform,
          deepLinkUrl: r.webUrl,
          webUrl: r.webUrl,
          platformRestaurantId: r.platformId,
          isAvailable: true,
          updatedAt: new Date(),
        },
      })

      stored++
    } catch (err) {
      console.error(`[STORE] Failed for ${r.name}:`, err instanceof Error ? err.message : err)
    }
  }

  return stored
}
