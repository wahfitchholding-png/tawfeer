/**
 * Careem Food direct API client.
 *
 * Careem Food runs on the Eateasily platform (acquired by Careem).
 * API base: https://uae.eateasily.com/api/v2/
 *
 * Key headers:
 *   Authorization: Bearer {token}
 *   X-Device-Id: {uuid}
 *   X-Platform: web | ios | android
 *   Accept-Language: en
 */

import type { CollectorLocation, CollectorResult } from '@/lib/collectors/types'
import type { StoredCredentials } from './types'
import { getDiscoveredEndpoint } from './credentials'
import { CredentialsExpiredError } from './talabat'

const EATEASILY_BASE = 'https://uae.eateasily.com/api/v2'

export async function fetchCareemMenu(
  slug: string,
  credentials: StoredCredentials,
  location: CollectorLocation
): Promise<CollectorResult | null> {
  const discoveredUrl = await getDiscoveredEndpoint('CAREEM', slug, 'menu')

  const menuUrl =
    discoveredUrl ??
    `${EATEASILY_BASE}/restaurants/?lat=${location.lat}&lng=${location.lng}&limit=50&offset=0`

  const controller = new AbortController()
  setTimeout(() => controller.abort(), 15000)

  const response = await fetch(menuUrl, {
    headers: buildCareemHeaders(credentials),
    signal: controller.signal,
  })

  if (response.status === 401 || response.status === 403) {
    throw new CredentialsExpiredError(`Careem returned ${response.status}`)
  }

  if (!response.ok) return null

  const data = await response.json()
  return parseCareemResponse(data, slug, menuUrl)
}

function buildCareemHeaders(credentials: StoredCredentials): Record<string, string> {
  return {
    'Accept': 'application/json',
    'Accept-Language': 'en',
    'User-Agent': 'CareemFood/1.0 (iPhone; iOS 17.2)',
    'X-Platform': 'web',
    ...(credentials['authorization'] ? { 'Authorization': credentials['authorization'] } : {}),
    ...(credentials['x-device-id'] ? { 'X-Device-Id': credentials['x-device-id'] } : {}),
    ...(credentials['cookie'] ? { 'Cookie': credentials['cookie'] } : {}),
  }
}

function parseCareemResponse(data: unknown, slug: string, sourceUrl: string): CollectorResult | null {
  if (!data || typeof data !== 'object') return null
  const root = data as Record<string, unknown>

  const categories =
    (root.categories as unknown[]) ??
    (root.menu_categories as unknown[]) ??
    ((root.data as Record<string, unknown>)?.categories as unknown[]) ??
    []

  const menuItems: CollectorResult['menuItems'] = []

  for (const cat of categories) {
    if (!cat || typeof cat !== 'object') continue
    const c = cat as Record<string, unknown>
    const category = String(c.name ?? c.title ?? 'Menu')
    const items = (c.items ?? c.products ?? []) as unknown[]

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item || typeof item !== 'object') continue
      const it = item as Record<string, unknown>

      const name = String(it.name ?? it.title ?? '')
      if (!name) continue

      const price = Number(it.price ?? it.basePrice ?? 0)
      if (price === 0) continue

      menuItems.push({
        platformItemId: String(it.id ?? `careem-${slug}-${i}`),
        name,
        price,
        description: it.description ? String(it.description) : undefined,
        category,
        isAvailable: it.is_available !== false && it.available !== false,
      })
    }
  }

  if (menuItems.length === 0) return null

  return {
    restaurantSlug: slug,
    platformRestaurantId: `careem-${slug}`,
    deepLinkUrl: `https://www.careem.com/en-ae/food/restaurant/${slug}-dubai-marina`,
    webUrl: sourceUrl,
    isAvailable: true,
    menuItems,
    deliveryInfo: {
      baseFee: Number(root.delivery_fee ?? 6),
      serviceFeePercent: 0,
      serviceFeeFlat: 4,
      smallOrderThreshold: 30,
      smallOrderFee: 5,
      estimatedMinutes: Number(root.delivery_time ?? root.eta ?? 28),
    },
    promotions: [],
  }
}
