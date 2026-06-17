/**
 * Keeta direct API client.
 *
 * Keeta (owned by Meituan) has a modern, consistent REST API.
 * It's the cleanest of the four platforms to work with.
 *
 * API base: https://api.keeta.com
 *
 * Key headers:
 *   Authorization: Bearer {token}
 *   X-Keeta-Version: {version}
 *   X-Device-Id: {uuid}
 *   Accept-Language: en-AE
 */

import type { CollectorLocation, CollectorResult } from '@/lib/collectors/types'
import type { StoredCredentials } from './types'
import { getDiscoveredEndpoint } from './credentials'
import { CredentialsExpiredError } from './talabat'

const KEETA_API_BASE = 'https://api.keeta.com'

export async function fetchKeetaMenu(
  slug: string,
  credentials: StoredCredentials,
  location: CollectorLocation
): Promise<CollectorResult | null> {
  const discoveredUrl = await getDiscoveredEndpoint('KEETA', slug, 'menu')

  const menuUrl =
    discoveredUrl ??
    `${KEETA_API_BASE}/v1/restaurants?lat=${location.lat}&lng=${location.lng}&limit=50`

  const controller = new AbortController()
  setTimeout(() => controller.abort(), 15000)

  const response = await fetch(menuUrl, {
    headers: buildKeetaHeaders(credentials),
    signal: controller.signal,
  })

  if (response.status === 401 || response.status === 403) {
    throw new CredentialsExpiredError(`Keeta returned ${response.status}`)
  }

  if (!response.ok) return null

  const data = await response.json()
  return parseKeetaResponse(data, slug, menuUrl)
}

function buildKeetaHeaders(credentials: StoredCredentials): Record<string, string> {
  return {
    'Accept': 'application/json',
    'Accept-Language': 'en-AE',
    'User-Agent': 'Keeta/2.0 (iPhone; iOS 17.2)',
    'X-Keeta-Country': 'AE',
    ...(credentials['authorization'] ? { 'Authorization': credentials['authorization'] } : {}),
    ...(credentials['x-keeta-version'] ? { 'X-Keeta-Version': credentials['x-keeta-version'] } : {}),
    ...(credentials['x-device-id'] ? { 'X-Device-Id': credentials['x-device-id'] } : {}),
    ...(credentials['cookie'] ? { 'Cookie': credentials['cookie'] } : {}),
  }
}

function parseKeetaResponse(data: unknown, slug: string, sourceUrl: string): CollectorResult | null {
  if (!data || typeof data !== 'object') return null
  const root = data as Record<string, unknown>

  const categories =
    (root.categories as unknown[]) ??
    (root.menu as unknown[]) ??
    ((root.data as Record<string, unknown>)?.categories as unknown[]) ??
    []

  const menuItems: CollectorResult['menuItems'] = []

  for (const cat of categories) {
    if (!cat || typeof cat !== 'object') continue
    const c = cat as Record<string, unknown>
    const category = String(c.name ?? 'Menu')
    const dishes = (c.dishes ?? c.items ?? c.products ?? []) as unknown[]

    for (let i = 0; i < dishes.length; i++) {
      const dish = dishes[i]
      if (!dish || typeof dish !== 'object') continue
      const d = dish as Record<string, unknown>

      const name = String(d.name ?? d.title ?? '')
      if (!name) continue

      const price = Number(d.price ?? d.basePrice ?? d.salePrice ?? 0)
      if (price === 0) continue

      menuItems.push({
        platformItemId: String(d.id ?? d.skuId ?? `keeta-${slug}-${i}`),
        name,
        price,
        originalPrice: d.originalPrice ? Number(d.originalPrice) : undefined,
        description: d.description ? String(d.description) : undefined,
        category,
        isAvailable: d.available !== false && d.status !== 'unavailable' && d.soldOut !== true,
      })
    }
  }

  if (menuItems.length === 0) return null

  const deliveryFee = Number(root.deliveryFee ?? root.delivery_fee ?? 4)
  const estimatedMinutes = Number(root.estimatedTime ?? root.eta ?? root.deliveryTime ?? 35)

  return {
    restaurantSlug: slug,
    platformRestaurantId: `keeta-${slug}`,
    deepLinkUrl: `https://www.keeta.com/ae/restaurant/${slug}-dubai-marina`,
    webUrl: sourceUrl,
    isAvailable: true,
    menuItems,
    deliveryInfo: {
      baseFee: deliveryFee,
      serviceFeePercent: 0,
      serviceFeeFlat: 2,
      smallOrderThreshold: 25,
      smallOrderFee: 3,
      estimatedMinutes,
    },
    promotions: [],
  }
}
