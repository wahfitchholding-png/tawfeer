/**
 * Network capture layer — plugs into any Playwright Page.
 *
 * Intercepts every outgoing request from the browser session and:
 *   1. Detects which ones are platform API calls (using PLATFORM_API_PATTERNS)
 *   2. Extracts auth headers from those requests
 *   3. Saves the endpoint URL so future runs can skip the browser entirely
 *   4. Saves the response body as a sample for the API client parser
 *
 * This runs transparently during every Playwright-based collection.
 * After the first successful run per platform, direct API mode kicks in.
 */

import type { Page, Request, Response } from 'playwright'
import type { Platform } from '@/types'
import { PLATFORM_API_PATTERNS } from '@/lib/api-clients/types'
import { saveCredentials, saveDiscoveredEndpoint } from '@/lib/api-clients/credentials'
import type { CollectorLocation } from './types'

interface CapturedRequest {
  url: string
  method: string
  headers: Record<string, string>
  responseBody?: string
  isMenuEndpoint: boolean
  isDeliveryEndpoint: boolean
}

export class NetworkCapture {
  private platform: Platform
  private slug: string
  private captured: CapturedRequest[] = []
  private patterns: typeof PLATFORM_API_PATTERNS[Platform]

  constructor(platform: Platform, slug: string) {
    this.platform = platform
    this.slug = slug
    this.patterns = PLATFORM_API_PATTERNS[platform]
  }

  attach(page: Page): void {
    // Intercept requests to save auth headers
    page.on('request', (request: Request) => {
      const url = request.url()

      // Skip ignored domains
      if (this.patterns.ignoredDomains.some(p => p.test(url))) return

      // Only capture API-looking requests
      const isApiCall =
        this.patterns.menuPatterns.some(p => p.test(url)) ||
        url.includes('/api/') ||
        url.includes('/graphql')

      if (!isApiCall) return

      const headers = request.headers()
      const authHeaders: Record<string, string> = {}

      for (const key of this.patterns.authHeaders) {
        if (headers[key]) authHeaders[key] = headers[key]
      }

      const isMenuEndpoint =
        this.patterns.menuPatterns.some(p => p.test(url)) &&
        (url.includes('menu') || url.includes('catalog') || url.includes('item'))

      const isDeliveryEndpoint =
        url.includes('delivery') || url.includes('fee') || url.includes('eta')

      this.captured.push({
        url,
        method: request.method(),
        headers: authHeaders,
        isMenuEndpoint,
        isDeliveryEndpoint,
      })
    })

    // Intercept responses to capture sample bodies
    page.on('response', async (response: Response) => {
      const url = response.url()

      if (this.patterns.ignoredDomains.some(p => p.test(url))) return
      if (!this.patterns.menuPatterns.some(p => p.test(url))) return

      const contentType = response.headers()['content-type'] ?? ''
      if (!contentType.includes('json')) return

      try {
        const body = await response.text()
        const existing = this.captured.find(c => c.url === url)
        if (existing) existing.responseBody = body
      } catch {
        // Body already consumed or unavailable
      }
    })
  }

  async persist(_location: CollectorLocation): Promise<void> {
    // Collect all auth headers across captured requests (union of all keys found)
    const allAuthHeaders: Record<string, string> = {}
    for (const req of this.captured) {
      Object.assign(allAuthHeaders, req.headers)
    }

    if (Object.keys(allAuthHeaders).length > 0) {
      await saveCredentials(this.platform, allAuthHeaders)
    }

    // Save the best menu endpoint URL we found
    const menuReq = this.captured.find(r => r.isMenuEndpoint && r.responseBody)
    if (menuReq) {
      // Strip per-request query params that might not be stable
      const cleanUrl = stripDynamicParams(menuReq.url, ['_t', 'timestamp', 'rand', '_v', 'v'])
      await saveDiscoveredEndpoint(
        this.platform,
        this.slug,
        'menu',
        cleanUrl,
        menuReq.method,
        menuReq.responseBody?.slice(0, 4000) // store first 4KB as a sample
      )
      console.log(`[capture:${this.platform}] Saved menu endpoint: ${cleanUrl}`)
    }

    const deliveryReq = this.captured.find(r => r.isDeliveryEndpoint && r.responseBody)
    if (deliveryReq) {
      const cleanUrl = stripDynamicParams(deliveryReq.url, ['_t', 'timestamp', 'rand'])
      await saveDiscoveredEndpoint(this.platform, this.slug, 'delivery', cleanUrl, deliveryReq.method)
    }

    console.log(
      `[capture:${this.platform}:${this.slug}] Captured ${this.captured.length} requests, ` +
      `${Object.keys(allAuthHeaders).length} auth headers`
    )
  }

  hasCapturedMenuEndpoint(): boolean {
    return this.captured.some(r => r.isMenuEndpoint)
  }
}

function stripDynamicParams(url: string, params: string[]): string {
  try {
    const u = new URL(url)
    for (const p of params) u.searchParams.delete(p)
    return u.toString()
  } catch {
    return url
  }
}
