import type { PlatformCollector, CollectorLocation, CollectorResult } from './types'
import { getCredentials, invalidateCredentials } from '@/lib/api-clients/credentials'
import { fetchDeliverooMenu } from '@/lib/api-clients/deliveroo'
import { CredentialsExpiredError } from '@/lib/api-clients/talabat'
import { NetworkCapture } from './capture'

const RESTAURANT_MAP: Record<string, { webUrl: string; platformId: string; deepLinkUrl: string }> = {
  mcdonalds:    { webUrl: 'https://deliveroo.ae/menu/dubai/dubai-marina/mcdonald-s-marina',  platformId: 'deliveroo-mc-marina',  deepLinkUrl: 'https://deliveroo.ae/menu/dubai/dubai-marina/mcdonald-s-marina' },
  kfc:          { webUrl: 'https://deliveroo.ae/menu/dubai/jbr/kfc-jbr',                    platformId: 'deliveroo-kfc-jbr',    deepLinkUrl: 'https://deliveroo.ae/menu/dubai/jbr/kfc-jbr' },
  'burger-king':{ webUrl: 'https://deliveroo.ae/menu/dubai/dubai-marina/burger-king-marina', platformId: 'deliveroo-bk-marina',  deepLinkUrl: 'https://deliveroo.ae/menu/dubai/dubai-marina/burger-king-marina' },
  hardees:      { webUrl: 'https://deliveroo.ae/menu/dubai/dubai-marina/hardees-marina',     platformId: 'deliveroo-hd-marina',  deepLinkUrl: 'https://deliveroo.ae/menu/dubai/dubai-marina/hardees-marina' },
  'pizza-hut':  { webUrl: 'https://deliveroo.ae/menu/dubai/jbr/pizza-hut-jbr',              platformId: 'deliveroo-ph-jbr',     deepLinkUrl: 'https://deliveroo.ae/menu/dubai/jbr/pizza-hut-jbr' },
}

export class DeliverooCollector implements PlatformCollector {
  readonly platform = 'DELIVEROO' as const

  async collect(restaurantSlug: string, location: CollectorLocation): Promise<CollectorResult> {
    const mapping = RESTAURANT_MAP[restaurantSlug]
    if (!mapping) throw new Error(`Deliveroo: no mapping for slug "${restaurantSlug}"`)

    const credentials = await getCredentials('DELIVEROO')
    if (credentials) {
      try {
        console.log(`[DELIVEROO:${restaurantSlug}] Trying direct API...`)
        const result = await fetchDeliverooMenu(restaurantSlug, credentials, location)
        if (result) {
          console.log(`[DELIVEROO:${restaurantSlug}] API success — ${result.menuItems.length} items`)
          return result
        }
        console.log(`[DELIVEROO:${restaurantSlug}] API returned no data, falling back to Playwright`)
      } catch (err) {
        if (err instanceof CredentialsExpiredError) {
          console.log(`[DELIVEROO:${restaurantSlug}] Credentials expired, invalidating...`)
          await invalidateCredentials('DELIVEROO')
        } else {
          console.warn(`[DELIVEROO:${restaurantSlug}] API error: ${err instanceof Error ? err.message : err}`)
        }
      }
    }

    return this.collectViaBrowser(restaurantSlug, mapping, location)
  }

  private async collectViaBrowser(
    slug: string,
    mapping: { webUrl: string; platformId: string; deepLinkUrl: string },
    location: CollectorLocation
  ): Promise<CollectorResult> {
    const { chromium } = await import('playwright')
    const capture = new NetworkCapture('DELIVEROO', slug)

    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
    const context = await browser.newContext({
      geolocation: { latitude: location.lat, longitude: location.lng },
      permissions: ['geolocation'],
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      viewport: { width: 390, height: 844 },
      locale: 'en-AE',
    })

    const page = await context.newPage()
    capture.attach(page)
    await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf}', r => r.abort())

    try {
      await page.goto(mapping.webUrl, { waitUntil: 'networkidle', timeout: 45000 })
      await page.waitForTimeout(4000)

      const menuItems = await page.evaluate((pid: string) => {
        const items: CollectorResult['menuItems'] = []
        document.querySelectorAll('[data-test-id="menu-item"]').forEach((el, i) => {
          const name = el.querySelector('[data-test-id="menu-item-name"]')?.textContent?.trim()
          const priceRaw = el.querySelector('[data-test-id="menu-item-price"]')?.textContent?.trim()
          if (!name || !priceRaw) return
          const price = parseFloat(priceRaw.replace(/[^0-9.]/g, ''))
          if (isNaN(price)) return
          items.push({ platformItemId: `${pid}-${i}`, name, price, category: 'Menu', isAvailable: true })
        })
        return items
      }, mapping.platformId)

      await capture.persist(location)

      return {
        restaurantSlug: slug,
        platformRestaurantId: mapping.platformId,
        deepLinkUrl: mapping.deepLinkUrl,
        webUrl: mapping.webUrl,
        isAvailable: menuItems.length > 0,
        menuItems,
        deliveryInfo: { baseFee: 8, serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 35, smallOrderFee: 6, estimatedMinutes: 20 },
        promotions: [],
      }
    } finally {
      await browser.close()
    }
  }
}
