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

async function makeBrowser(lat: number, lng: number) {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ headless: true, args: BROWSER_ARGS })
  const context = await browser.newContext({
    geolocation: { latitude: lat, longitude: lng },
    permissions: ['geolocation'],
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844 },
    locale: 'en-AE',
    timezoneId: 'Asia/Dubai',
  })
  return { browser, context }
}

function tryExtractRestaurants(body: unknown, platform: Platform, baseUrl: string): DiscoveredRestaurant[] {
  const results: DiscoveredRestaurant[] = []
  if (!body || typeof body !== 'object') return results

  const b = body as Record<string, unknown>

  // Try every common API response shape
  const candidates =
    (b.vendors as unknown[]) ??
    (b.restaurants as unknown[]) ??
    (b.businesses as unknown[]) ??
    ((b.data as Record<string, unknown>)?.vendors as unknown[]) ??
    ((b.data as Record<string, unknown>)?.restaurants as unknown[]) ??
    ((b.data as Record<string, unknown>)?.results as unknown[]) ??
    (b.results as unknown[]) ??
    []

  if (!Array.isArray(candidates)) return results

  for (const item of candidates) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    const name = String(r.name ?? r.nameEn ?? r.restaurantName ?? r.title ?? '')
    if (!name || name.length < 2) continue

    const slug = String(r.slug ?? r.urlSlug ?? r.link ?? r.restaurantLink ?? r.id ?? '')
    const cuisine = String(
      (r.cuisine as string[])?.[0] ?? r.restaurantType ?? r.category ?? r.cuisineType ?? 'Restaurant'
    )

    const url = slug.startsWith('http') ? slug : `${baseUrl}${slug}`
    results.push({ name, cuisine, platform, webUrl: url, platformId: String(r.id ?? slug) })
  }
  return results
}

async function discoverPlatform(
  platform: Platform,
  listUrl: string,
  lat: number,
  lng: number,
  domExtractor: (html: string) => DiscoveredRestaurant[]
): Promise<DiscoveredRestaurant[]> {
  const { browser, context } = await makeBrowser(lat, lng)
  const captured: DiscoveredRestaurant[] = []

  const platformDomain = new URL(listUrl).hostname

  try {
    context.on('response', async (response) => {
      try {
        const url = response.url()
        if (!url.includes(platformDomain)) return
        if (response.status() !== 200) return
        const ct = response.headers()['content-type'] ?? ''
        if (!ct.includes('json')) return
        const body = await response.json()
        const found = tryExtractRestaurants(body, platform, `https://${platformDomain}/`)
        if (found.length > 0) captured.push(...found)
      } catch {}
    })

    const page = await context.newPage()
    await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf,mp4,webp,avif}', r => r.abort())

    await page.goto(listUrl, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(5000)

    // Scroll to load all lazy-loaded restaurants (stop after 2 empty scrolls)
    let emptyScrolls = 0
    for (let i = 0; i < 25; i++) {
      const prevCount = captured.length
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(2500)
      if (captured.length === prevCount) {
        emptyScrolls++
        if (emptyScrolls >= 2) break
      } else {
        emptyScrolls = 0
      }
    }

    if (captured.length === 0) {
      const html = await page.content()
      const fromDom = domExtractor(html)
      captured.push(...fromDom)
      console.log(`[${platform}] DOM extracted ${fromDom.length} restaurants`)
    } else {
      console.log(`[${platform}] API captured ${captured.length} restaurants`)
    }
  } catch (err) {
    console.error(`[${platform}] Discovery error: ${err instanceof Error ? err.message : err}`)
  } finally {
    await browser.close()
  }

  return captured
}

function talabatDomExtractor(html: string): DiscoveredRestaurant[] {
  const results: DiscoveredRestaurant[] = []
  const linkPattern = /href="(\/uae\/[^"?#]+)"/g
  const titlePattern = /<h[23][^>]*>([^<]{3,60})<\/h[23]>/g

  const links: string[] = []
  let m
  while ((m = linkPattern.exec(html)) !== null) {
    const href = m[1]
    if (!href.includes('restaurants') && !href.includes('category')) {
      links.push(href)
    }
  }

  const titles: string[] = []
  while ((m = titlePattern.exec(html)) !== null) {
    const t = m[1].trim()
    if (t.length > 2 && !t.includes('<')) titles.push(t)
  }

  const seen = new Set<string>()
  links.forEach((href, i) => {
    const slug = href.split('/uae/')[1]?.split('/')[0]
    if (!slug || seen.has(slug)) return
    seen.add(slug)
    const name = titles[i] ?? slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    results.push({
      name,
      cuisine: 'Restaurant',
      platform: 'TALABAT',
      webUrl: `https://www.talabat.com${href}`,
      platformId: slug,
    })
  })
  return results
}

function deliverooDomExtractor(html: string): DiscoveredRestaurant[] {
  const results: DiscoveredRestaurant[] = []
  const linkPattern = /href="(\/menu\/[^"?#]+)"/g
  const namePattern = /"name":"([^"]{3,60})"/g
  const seen = new Set<string>()

  let m
  const links: string[] = []
  while ((m = linkPattern.exec(html)) !== null) links.push(m[1])

  const names: string[] = []
  while ((m = namePattern.exec(html)) !== null) names.push(m[1])

  links.forEach((href, i) => {
    const slug = href.split('/').pop() ?? ''
    if (!slug || seen.has(slug)) return
    seen.add(slug)
    const name = names[i] ?? slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    results.push({
      name,
      cuisine: 'Restaurant',
      platform: 'DELIVEROO',
      webUrl: `https://deliveroo.ae${href}`,
      platformId: slug,
    })
  })
  return results
}

function genericDomExtractor(platform: Platform, baseUrl: string, pathContains: string) {
  return (html: string): DiscoveredRestaurant[] => {
    const results: DiscoveredRestaurant[] = []
    const linkPattern = new RegExp(`href="(${pathContains}[^"?#]+)"`, 'g')
    const namePattern = /<h[23][^>]*>([^<]{3,60})<\/h[23]>/g
    const seen = new Set<string>()
    let m

    const links: string[] = []
    while ((m = linkPattern.exec(html)) !== null) links.push(m[1])

    const names: string[] = []
    while ((m = namePattern.exec(html)) !== null) {
      const t = m[1].trim()
      if (t.length > 2) names.push(t)
    }

    links.forEach((href, i) => {
      const slug = href.split('/').pop() ?? ''
      if (!slug || seen.has(slug)) return
      seen.add(slug)
      const name = names[i] ?? slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      results.push({ name, cuisine: 'Restaurant', platform, webUrl: `${baseUrl}${href}`, platformId: slug })
    })
    return results
  }
}

export async function discoverRestaurantsAtLocation(lat: number, lng: number): Promise<number> {
  console.log(`[DISCOVER] Starting discovery at ${lat}, ${lng}`)

  // Run sequentially to limit memory usage (one Chromium at a time)
  const platforms: Array<() => Promise<DiscoveredRestaurant[]>> = [
    () => discoverPlatform('TALABAT', 'https://www.talabat.com/uae/restaurants', lat, lng, talabatDomExtractor),
    () => discoverPlatform('DELIVEROO', `https://deliveroo.ae/restaurants?lat=${lat}&lng=${lng}`, lat, lng, deliverooDomExtractor),
    () => discoverPlatform('CAREEM', 'https://www.careem.com/en-ae/food', lat, lng, genericDomExtractor('CAREEM', 'https://www.careem.com', '/en-ae/food/restaurant/')),
    () => discoverPlatform('KEETA', 'https://www.keeta.com/ae', lat, lng, genericDomExtractor('KEETA', 'https://www.keeta.com', '/ae/restaurant/')),
    () => discoverPlatform('NOON_FOOD', 'https://food.noon.com/ae', lat, lng, genericDomExtractor('NOON_FOOD', 'https://food.noon.com', '/ae/')),
  ]

  let totalStored = 0
  for (const fn of platforms) {
    try {
      const restaurants = await fn()
      totalStored += await storeDiscoveredRestaurants(restaurants, lat, lng)
    } catch (err) {
      console.error('[DISCOVER] Platform failed:', err)
    }
  }

  console.log(`[DISCOVER] Complete — stored ${totalStored} restaurants`)
  return totalStored
}

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
      // Try to match existing restaurant by name
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
        update: { deepLinkUrl: r.webUrl, webUrl: r.webUrl, platformRestaurantId: r.platformId, isAvailable: true, updatedAt: new Date() },
        create: { restaurantId, platform: r.platform, deepLinkUrl: r.webUrl, webUrl: r.webUrl, platformRestaurantId: r.platformId, isAvailable: true, updatedAt: new Date() },
      })

      stored++
    } catch (err) {
      console.error(`[STORE] Failed for ${r.name}:`, err instanceof Error ? err.message : err)
    }
  }

  return stored
}
