/**
 * Talabat direct API client.
 *
 * Uses credentials and endpoint URLs captured during the Playwright bootstrap run.
 * When the session is fresh this is typically 5-10x faster than browser scraping.
 *
 * Talabat's web app issues calls to patterns like:
 *   GET https://www.talabat.com/nextjs-api/proxy/catalog/menu?branchId={id}&countryId=30
 *   GET https://api.talabat.com/api/3/restaurant/{id}?langCode=en
 *
 * The exact URLs are discovered automatically by NetworkCapture during the first Playwright run.
 */

import type { CollectorLocation, CollectorResult } from '@/lib/collectors/types'
import type { StoredCredentials } from './types'
import { getDiscoveredEndpoint } from './credentials'

export async function fetchTalabatMenu(
  slug: string,
  credentials: StoredCredentials,
  location: CollectorLocation
): Promise<CollectorResult | null> {
  // Try the auto-discovered endpoint first
  const discoveredUrl = await getDiscoveredEndpoint('TALABAT', slug, 'menu')

  const candidateUrls = [
    discoveredUrl,
    // Known fallback URL patterns for Talabat UAE
    `https://www.talabat.com/nextjs-api/proxy/catalog/menu?countryId=30&areaId=1&languageId=2`,
    `https://api.talabat.com/api/3/menu?restaurantId=&langCode=en`,
  ].filter(Boolean) as string[]

  for (const url of candidateUrls) {
    try {
      const result = await tryFetch(url, credentials, slug, location)
      if (result) return result
    } catch {
      continue
    }
  }

  return null
}

async function tryFetch(
  url: string,
  credentials: StoredCredentials,
  slug: string,
  location: CollectorLocation
): Promise<CollectorResult | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  // Inject location into URL if it has lat/lng placeholders or params
  let finalUrl = url
  try {
    const u = new URL(url)
    if (!u.searchParams.has('lat') && location.lat) {
      u.searchParams.set('lat', String(location.lat))
      u.searchParams.set('lng', String(location.lng))
    }
    finalUrl = u.toString()
  } catch {
    // Not a valid URL to parse, use as-is
  }

  try {
    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: buildHeaders(credentials),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        // Signal that credentials need refresh
        throw new CredentialsExpiredError(`Talabat returned ${response.status}`)
      }
      return null
    }

    const data = await response.json()
    return parseTalabatResponse(data, slug, url)
  } finally {
    clearTimeout(timeout)
  }
}

function buildHeaders(credentials: StoredCredentials): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Accept-Language': 'en-AE,en;q=0.9',
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15',
    'Referer': 'https://www.talabat.com/',
    'Origin': 'https://www.talabat.com',
  }

  // Inject all stored credentials as headers
  for (const [key, value] of Object.entries(credentials)) {
    if (key === 'cookie') {
      headers['Cookie'] = value
    } else {
      headers[key] = value
    }
  }

  return headers
}

function parseTalabatResponse(data: unknown, slug: string, sourceUrl: string): CollectorResult | null {
  if (!data || typeof data !== 'object') return null

  const root = data as Record<string, unknown>

  // Talabat response shapes vary — try multiple known structures
  const categories =
    (root.categories as unknown[]) ??
    (root.sections as unknown[]) ??
    ((root.data as Record<string, unknown>)?.categories as unknown[]) ??
    []

  const menuItems: CollectorResult['menuItems'] = []

  for (const cat of categories) {
    if (!cat || typeof cat !== 'object') continue
    const c = cat as Record<string, unknown>
    const category = String(c.name ?? c.title ?? 'Menu')
    const items = (c.items ?? c.products ?? c.menuItems ?? []) as unknown[]

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item || typeof item !== 'object') continue
      const it = item as Record<string, unknown>

      const name = String(it.name ?? it.title ?? '')
      if (!name) continue

      // Price may be in fils (÷1000) or AED directly
      let price = Number(it.price ?? it.priceVal ?? it.basePrice ?? 0)
      if (price > 1000) price = price / 1000 // fils → AED

      if (price === 0) continue

      menuItems.push({
        platformItemId: String(it.id ?? `${slug}-${i}`),
        name,
        price,
        originalPrice: it.originalPrice ? Number(it.originalPrice) / (Number(it.originalPrice) > 1000 ? 1000 : 1) : undefined,
        description: it.description ? String(it.description) : undefined,
        category,
        isAvailable: it.available !== false && it.isAvailable !== false,
      })
    }
  }

  if (menuItems.length === 0) return null

  return {
    restaurantSlug: slug,
    platformRestaurantId: `talabat-${slug}`,
    deepLinkUrl: `https://www.talabat.com/uae/${slug}-dubai-marina`,
    webUrl: sourceUrl,
    isAvailable: true,
    menuItems,
    deliveryInfo: {
      baseFee: 7,
      serviceFeePercent: 0,
      serviceFeeFlat: 3,
      smallOrderThreshold: 30,
      smallOrderFee: 5,
      estimatedMinutes: 25,
    },
    promotions: [],
  }
}

export class CredentialsExpiredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CredentialsExpiredError'
  }
}
