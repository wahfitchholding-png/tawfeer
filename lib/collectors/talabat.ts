import type { PlatformCollector, CollectorLocation, CollectorResult } from './types'
import { getCredentials, invalidateCredentials } from '@/lib/api-clients/credentials'
import { fetchTalabatMenu, CredentialsExpiredError } from '@/lib/api-clients/talabat'
import { NetworkCapture } from './capture'

const RESTAURANT_MAP: Record<string, { webUrl: string; platformId: string; deepLinkUrl: string }> = {
  mcdonalds:    { webUrl: 'https://www.talabat.com/uae/mcdonalds-dubai-marina-1',    platformId: 'talabat-mc-marina',    deepLinkUrl: 'https://www.talabat.com/uae/mcdonalds-dubai-marina-1' },
  kfc:          { webUrl: 'https://www.talabat.com/uae/kfc-the-walk-jbr',            platformId: 'talabat-kfc-jbr',      deepLinkUrl: 'https://www.talabat.com/uae/kfc-the-walk-jbr' },
  'burger-king':{ webUrl: 'https://www.talabat.com/uae/burger-king-dubai-marina',    platformId: 'talabat-bk-marina',    deepLinkUrl: 'https://www.talabat.com/uae/burger-king-dubai-marina' },
  hardees:      { webUrl: 'https://www.talabat.com/uae/hardees-dubai-marina',        platformId: 'talabat-hd-marina',    deepLinkUrl: 'https://www.talabat.com/uae/hardees-dubai-marina' },
  'pizza-hut':  { webUrl: 'https://www.talabat.com/uae/pizza-hut-jbr',              platformId: 'talabat-ph-jbr',       deepLinkUrl: 'https://www.talabat.com/uae/pizza-hut-jbr' },
}

export class TalabatCollector implements PlatformCollector {
  readonly platform = 'TALABAT' as const

  async collect(restaurantSlug: string, location: CollectorLocation): Promise<CollectorResult> {
    const mapping = RESTAURANT_MAP[restaurantSlug]
    if (!mapping) throw new Error(`Talabat: no mapping for slug "${restaurantSlug}"`)

    // ── STEP 1: Try direct API if we have credentials ──────────────────────
    const credentials = await getCredentials('TALABAT')
    if (credentials) {
      try {
        console.log(`[TALABAT:${restaurantSlug}] Trying direct API...`)
        const result = await fetchTalabatMenu(restaurantSlug, credentials, location)
        if (result) {
          console.log(`[TALABAT:${restaurantSlug}] API success — ${result.menuItems.length} items`)
          return result
        }
        console.log(`[TALABAT:${restaurantSlug}] API returned no data, falling back to Playwright`)
      } catch (err) {
        if (err instanceof CredentialsExpiredError) {
          console.log(`[TALABAT:${restaurantSlug}] Credentials expired, invalidating...`)
          await invalidateCredentials('TALABAT')
        } else {
          console.warn(`[TALABAT:${restaurantSlug}] API error: ${err instanceof Error ? err.message : err}`)
        }
      }
    } else {
      console.log(`[TALABAT:${restaurantSlug}] No credentials — running bootstrap Playwright session`)
    }

    // ── STEP 2: Playwright fallback (also captures credentials) ───────────
    return this.collectViaBrowser(restaurantSlug, mapping, location)
  }

  private async collectViaBrowser(
    slug: string,
    mapping: { webUrl: string; platformId: string; deepLinkUrl: string },
    location: CollectorLocation
  ): Promise<CollectorResult> {
    const { chromium } = await import('playwright')
    const capture = new NetworkCapture('TALABAT', slug)

    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
    })

    const context = await browser.newContext({
      geolocation: { latitude: location.lat, longitude: location.lng },
      permissions: ['geolocation'],
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
      viewport: { width: 390, height: 844 },
      locale: 'en-AE',
      timezoneId: 'Asia/Dubai',
    })

    const page = await context.newPage()
    capture.attach(page)

    await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf}', r => r.abort())

    try {
      await page.goto(mapping.webUrl, { waitUntil: 'networkidle', timeout: 45000 })
      await page.waitForTimeout(3000)

      const menuItems = await page.evaluate(() => {
        const items: CollectorResult['menuItems'] = []
        const sections = document.querySelectorAll('[data-testid="section-container"]')

        sections.forEach(section => {
          const category = section.querySelector('[data-testid="section-header"]')?.textContent?.trim() ?? 'Menu'
          section.querySelectorAll('[data-testid="menu-item"]').forEach((el, i) => {
            const name = el.querySelector('[data-testid="item-name"]')?.textContent?.trim()
            const priceRaw = el.querySelector('[data-testid="item-price"]')?.textContent?.trim()
            if (!name || !priceRaw) return
            const price = parseFloat(priceRaw.replace(/[^0-9.]/g, ''))
            if (isNaN(price)) return
            items.push({ platformItemId: `talabat-${i}`, name, price, category, isAvailable: true })
          })
        })

        return items
      })

      const deliveryInfo = await page.evaluate(() => {
        const feeEl = document.querySelector('[data-testid="delivery-fee-value"]')
        const timeEl = document.querySelector('[data-testid="delivery-time"]')
        return {
          baseFee: feeEl ? parseFloat(feeEl.textContent!.replace(/[^0-9.]/g, '')) || 7 : 7,
          serviceFeePercent: 0,
          serviceFeeFlat: 3,
          smallOrderThreshold: 30,
          smallOrderFee: 5,
          estimatedMinutes: timeEl ? parseInt(timeEl.textContent!.replace(/[^0-9]/g, '')) || 25 : 25,
        }
      })

      // Save captured credentials and endpoints for next run
      await capture.persist(location)

      return {
        restaurantSlug: slug,
        platformRestaurantId: mapping.platformId,
        deepLinkUrl: mapping.deepLinkUrl,
        webUrl: mapping.webUrl,
        isAvailable: menuItems.length > 0,
        menuItems,
        deliveryInfo,
        promotions: [],
      }
    } finally {
      await browser.close()
    }
  }
}
