import type { PlatformCollector, CollectorLocation, CollectorResult } from './types'
import { getCredentials, invalidateCredentials } from '@/lib/api-clients/credentials'
import { fetchCareemMenu } from '@/lib/api-clients/careem'
import { CredentialsExpiredError } from '@/lib/api-clients/talabat'
import { NetworkCapture } from './capture'

const RESTAURANT_MAP: Record<string, { webUrl: string; platformId: string; deepLinkUrl: string }> = {
  mcdonalds:    { webUrl: 'https://www.careem.com/en-ae/food/restaurant/mcdonalds-dubai-marina',  platformId: 'careem-mc-marina',  deepLinkUrl: 'https://www.careem.com/en-ae/food/restaurant/mcdonalds-dubai-marina' },
  kfc:          { webUrl: 'https://www.careem.com/en-ae/food/restaurant/kfc-jbr',                 platformId: 'careem-kfc-jbr',    deepLinkUrl: 'https://www.careem.com/en-ae/food/restaurant/kfc-jbr' },
  'burger-king':{ webUrl: 'https://www.careem.com/en-ae/food/restaurant/burger-king-marina',      platformId: 'careem-bk-marina',  deepLinkUrl: 'https://www.careem.com/en-ae/food/restaurant/burger-king-marina' },
  hardees:      { webUrl: 'https://www.careem.com/en-ae/food/restaurant/hardees-dubai-marina',    platformId: 'careem-hd-marina',  deepLinkUrl: 'https://www.careem.com/en-ae/food/restaurant/hardees-dubai-marina' },
  'pizza-hut':  { webUrl: 'https://www.careem.com/en-ae/food/restaurant/pizza-hut-jbr',          platformId: 'careem-ph-jbr',     deepLinkUrl: 'https://www.careem.com/en-ae/food/restaurant/pizza-hut-jbr' },
}

export class CareemCollector implements PlatformCollector {
  readonly platform = 'CAREEM' as const

  async collect(restaurantSlug: string, location: CollectorLocation): Promise<CollectorResult> {
    const mapping = RESTAURANT_MAP[restaurantSlug]
    if (!mapping) throw new Error(`Careem: no mapping for slug "${restaurantSlug}"`)

    const credentials = await getCredentials('CAREEM')
    if (credentials) {
      try {
        console.log(`[CAREEM:${restaurantSlug}] Trying direct API...`)
        const result = await fetchCareemMenu(restaurantSlug, credentials, location)
        if (result) {
          console.log(`[CAREEM:${restaurantSlug}] API success — ${result.menuItems.length} items`)
          return result
        }
      } catch (err) {
        if (err instanceof CredentialsExpiredError) {
          await invalidateCredentials('CAREEM')
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
    const capture = new NetworkCapture('CAREEM', slug)

    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
    const context = await browser.newContext({
      geolocation: { latitude: location.lat, longitude: location.lng },
      permissions: ['geolocation'],
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
      viewport: { width: 390, height: 844 },
      locale: 'en-AE',
    })

    const page = await context.newPage()
    capture.attach(page)
    await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf}', r => r.abort())

    try {
      await page.goto(mapping.webUrl, { waitUntil: 'networkidle', timeout: 45000 })
      await page.waitForTimeout(3000)

      const menuItems = await page.evaluate((pid: string) => {
        const items: CollectorResult['menuItems'] = []
        const sections = document.querySelectorAll('.menu-category, [class*="category"]')
        sections.forEach(section => {
          const category = section.querySelector('h2, h3, [class*="category-name"]')?.textContent?.trim() ?? 'Menu'
          section.querySelectorAll('.menu-item, [class*="menu-item"]').forEach((el, i) => {
            const name = el.querySelector('[class*="item-name"], h4, h3')?.textContent?.trim()
            const priceRaw = el.querySelector('[class*="price"]')?.textContent?.trim()
            if (!name || !priceRaw) return
            const price = parseFloat(priceRaw.replace(/[^0-9.]/g, ''))
            if (isNaN(price)) return
            items.push({ platformItemId: `${pid}-${i}`, name, price, category, isAvailable: true })
          })
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
        deliveryInfo: { baseFee: 6, serviceFeeFlat: 4, serviceFeePercent: 0, smallOrderThreshold: 30, smallOrderFee: 5, estimatedMinutes: 28 },
        promotions: [],
      }
    } finally {
      await browser.close()
    }
  }
}
