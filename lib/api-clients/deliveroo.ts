/**
 * Deliveroo direct API client.
 *
 * Deliveroo's internal API is well-structured. The menu endpoint returns
 * clean JSON with categories and item prices in pence (÷100 for AED).
 *
 * Key discovered headers (from mitmproxy / Chrome DevTools):
 *   Authorization: Bearer {token}         — rotates per session
 *   X-Roo-Guid: {uuid}                   — device identifier, stable
 *   X-Roo-Country: ae
 *   X-Roo-Language: en
 *
 * Endpoint pattern:
 *   GET https://consumer-ow-api.deliveroo.com/orderapp/v2/menus/{restaurantId}
 *       ?lat={lat}&lng={lng}&fulfillment_method=delivery
 */

import type { CollectorLocation, CollectorResult } from '@/lib/collectors/types'
import type { StoredCredentials } from './types'
import { getDiscoveredEndpoint } from './credentials'
import { CredentialsExpiredError } from './talabat'

const DELIVEROO_API_BASE = 'https://consumer-ow-api.deliveroo.com'

export async function fetchDeliverooMenu(
  slug: string,
  credentials: StoredCredentials,
  location: CollectorLocation
): Promise<CollectorResult | null> {
  const discoveredUrl = await getDiscoveredEndpoint('DELIVEROO', slug, 'menu')

  // Inject lat/lng into discovered URL, or use known pattern
  const menuUrl = discoveredUrl
    ? injectLocation(discoveredUrl, location)
    : `${DELIVEROO_API_BASE}/orderapp/v2/restaurants?lat=${location.lat}&lng=${location.lng}&fulfillment_method=delivery&limit=50`

  const controller = new AbortController()
  setTimeout(() => controller.abort(), 15000)

  const response = await fetch(menuUrl, {
    headers: buildDeliverooHeaders(credentials),
    signal: controller.signal,
  })

  if (response.status === 401 || response.status === 403) {
    throw new CredentialsExpiredError(`Deliveroo returned ${response.status}`)
  }

  if (!response.ok) return null

  const data = await response.json()
  return parseDeliverooResponse(data, slug, menuUrl)
}

function buildDeliverooHeaders(credentials: StoredCredentials): Record<string, string> {
  return {
    'Accept': 'application/json',
    'Accept-Language': 'en-AE',
    'User-Agent': 'Deliveroo/3.189.0 (iPhone; iOS 17.2)',
    'X-Roo-Country': 'ae',
    'X-Roo-Language': 'en',
    'X-Roo-Currency': 'AED',
    // Merge in captured credentials
    ...(credentials['authorization'] ? { 'Authorization': credentials['authorization'] } : {}),
    ...(credentials['x-roo-guid'] ? { 'X-Roo-Guid': credentials['x-roo-guid'] } : {}),
    ...(credentials['cookie'] ? { 'Cookie': credentials['cookie'] } : {}),
  }
}

function injectLocation(url: string, location: CollectorLocation): string {
  try {
    const u = new URL(url)
    u.searchParams.set('lat', String(location.lat))
    u.searchParams.set('lng', String(location.lng))
    return u.toString()
  } catch {
    return url
  }
}

function parseDeliverooResponse(data: unknown, slug: string, sourceUrl: string): CollectorResult | null {
  if (!data || typeof data !== 'object') return null

  const root = data as Record<string, unknown>

  // Deliveroo menu response structures
  const categories =
    (root.menu_categories as unknown[]) ??
    (root.categories as unknown[]) ??
    ((root.menu as Record<string, unknown>)?.categories as unknown[]) ??
    []

  const menuItems: CollectorResult['menuItems'] = []

  for (const cat of categories) {
    if (!cat || typeof cat !== 'object') continue
    const c = cat as Record<string, unknown>
    const category = String(c.name ?? 'Menu')
    const items = (c.menu_items ?? c.items ?? []) as unknown[]

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item || typeof item !== 'object') continue
      const it = item as Record<string, unknown>

      const name = String(it.name ?? '')
      if (!name) continue

      // Deliveroo prices are in minor units (pence / fils) — divide by 100
      const priceRaw = Number(it.price ?? it.price_including_tax ?? 0)
      const price = priceRaw > 100 ? priceRaw / 100 : priceRaw

      if (price === 0) continue

      menuItems.push({
        platformItemId: String(it.id ?? `deliveroo-${slug}-${i}`),
        name,
        price,
        description: it.description ? String(it.description) : undefined,
        category,
        isAvailable: it.available !== false,
      })
    }
  }

  if (menuItems.length === 0) return null

  // Extract delivery fee if present at top level
  const deliveryFee = Number((root.delivery_fee ?? root.minimum_delivery_fee ?? 0)) / 100 || 8

  return {
    restaurantSlug: slug,
    platformRestaurantId: `deliveroo-${slug}`,
    deepLinkUrl: `https://deliveroo.ae/menu/dubai/dubai-marina/${slug}-marina`,
    webUrl: sourceUrl,
    isAvailable: true,
    menuItems,
    deliveryInfo: {
      baseFee: deliveryFee,
      serviceFeePercent: 0,
      serviceFeeFlat: 2,
      smallOrderThreshold: 35,
      smallOrderFee: 6,
      estimatedMinutes: Number(root.delivery_time ?? root.estimated_delivery_time ?? 20),
    },
    promotions: [],
  }
}
