import type { PlatformCollector, CollectorLocation, CollectorResult } from './types'
import { getCredentials, invalidateCredentials } from '@/lib/api-clients/credentials'
import { fetchKeetaMenu } from '@/lib/api-clients/keeta'
import { CredentialsExpiredError } from '@/lib/api-clients/talabat'
import { NetworkCapture } from './capture'

const RESTAURANT_MAP: Record<string, { webUrl: string; platformId: string; deepLinkUrl: string }> = {
  mcdonalds:    { webUrl: 'https://www.keeta.com/ae/restaurant/mcdonalds-dubai-marina',  platformId: 'keeta-mc-marina',  deepLinkUrl: 'https://www.keeta.com/ae/restaurant/mcdonalds-dubai-marina' },
  kfc:          { webUrl: 'https://www.keeta.com/ae/restaurant/kfc-jbr',                 platformId: 'keeta-kfc-jbr',    deepLinkUrl: 'https://www.keeta.com/ae/restaurant/kfc-jbr' },
  'burger-king':{ webUrl: 'https://www.keeta.com/ae/restaurant/burger-king-marina',      platformId: 'keeta-bk-marina',  deepLinkUrl: 'https://www.keeta.com/ae/restaurant/burger-king-marina' },
  hardees:      { webUrl: 'https://www.keeta.com/ae/restaurant/hardees-dubai-marina',    platformId: 'keeta-hd-marina',  deepLinkUrl: 'https://www.keeta.com/ae/restaurant/hardees-dubai-marina' },
  'pizza-hut':  { webUrl: 'https://www.keeta.com/ae/restaurant/pizza-hut-jbr',          platformId: 'keeta-ph-jbr',     deepLinkUrl: 'https://www.keeta.com/ae/restaurant/pizza-hut-jbr' },
}

export class KeetaCollector implements PlatformCollector {
  readonly platform = 'KEETA' as const

  async collect(restaurantSlug: string, location: CollectorLocation): Promise<CollectorResult> {
    const mapping = RESTAURANT_MAP[restaurantSlug]
    if (!mapping) throw new Error(`Keeta: no mapping for slug "${restaurantSlug}"`)

    const credentials = await getCredentials('KEETA')
    if (credentials) {
      try {
        console.log(`[KEETA:${restaurantSlug}] Trying direct API...`)
        const result = await fetchKeetaMenu(restaurantSlug, credentials, location)
        if (result) {
          console.log(`[KEETA:${restaurantSlug}] API success — ${result.menuItems.length} items`)
          return result
        }
      } catch (err) {
        if (err instanceof CredentialsExpiredError) {
          await invalidateCredentials('KEETA')
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
    const capture = new NetworkCapture('KEETA', slug)

    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
    const context = await browser.newContext({
      geolocation: { latitude: location.lat, longitude: location.lng },
      permissions: ['geolocation'],
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
      viewport: { width: 390, height: 844 },
    })

    const page = await context.newPage()
    capture.attach(page)
    await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf}', r => r.abort())

    try {
      await page.goto(mapping.webUrl, { waitUntil: 'networkidle', timeout: 45000 })
      await page.waitForTimeout(3000)

      const menuItems = await page.evaluate((pid: string) => {
        const items: CollectorResult['menuItems'] = []
        document.querySelectorAll('[class*="dish"], [class*="item"]').forEach((el, i) => {
          const name = el.querySelector('[class*="name"], h3, h4')?.textContent?.trim()
          const priceRaw = el.querySelector('[class*="price"]')?.textContent?.trim()
          if (!name || !priceRaw) return
          const price = parseFloat(priceRaw.replace(/[^0-9.]/g, ''))
          if (isNaN(price) || price === 0) return
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
        deliveryInfo: { baseFee: 4, serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 25, smallOrderFee: 3, estimatedMinutes: 35 },
        promotions: [],
      }
    } finally {
      await browser.close()
    }
  }
}
