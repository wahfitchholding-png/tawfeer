import type { Platform } from '@/types'
import type { CollectorResult } from '@/lib/collectors/types'

export interface StoredCredentials {
  [key: string]: string
}

export interface DiscoveredEndpoint {
  url: string
  method: string
  platform: Platform
  slug: string
  endpointType: 'menu' | 'delivery' | 'restaurant' | 'search'
}

export interface ApiClientResult {
  success: boolean
  data?: CollectorResult
  error?: string
  credentialsExpired?: boolean
}

// Patterns we watch for when intercepting Playwright network traffic
export const PLATFORM_API_PATTERNS: Record<Platform, {
  menuPatterns: RegExp[]
  authHeaders: string[]
  ignoredDomains: RegExp[]
}> = {
  TALABAT: {
    menuPatterns: [
      /talabat\.com\/api\//,
      /api\.talabat\.com\//,
      /talabat\.com\/nextjs-api\//,
      /\/menu/,
      /\/restaurant\//,
      /\/catalog\//,
    ],
    authHeaders: ['authorization', 'cookie', 'x-requested-with', 'x-correlation-id'],
    ignoredDomains: [/google/, /facebook/, /analytics/, /gtm/, /cdn/],
  },
  DELIVEROO: {
    menuPatterns: [
      /consumer-ow-api\.deliveroo\.com/,
      /api\.deliveroo\.com/,
      /deliveroo\.ae\/api/,
      /\/menus?\//,
      /\/full_menu/,
      /orderapp/,
    ],
    authHeaders: ['authorization', 'x-roo-guid', 'x-roo-country', 'x-roo-language', 'cookie'],
    ignoredDomains: [/google/, /facebook/, /analytics/, /gtm/, /cdn/, /sentry/],
  },
  CAREEM: {
    menuPatterns: [
      /eateasily\.com\/api/,
      /careem\.com\/api/,
      /food\.careem\.com/,
      /\/restaurants?\//,
      /\/menu/,
    ],
    authHeaders: ['authorization', 'x-device-id', 'x-platform', 'cookie'],
    ignoredDomains: [/google/, /facebook/, /analytics/, /gtm/, /cdn/],
  },
  KEETA: {
    menuPatterns: [
      /api\.keeta\.com/,
      /keeta\.com\/api/,
      /\/restaurant\//,
      /\/menu/,
      /\/dishes/,
    ],
    authHeaders: ['authorization', 'x-keeta-version', 'x-device-id', 'cookie'],
    ignoredDomains: [/google/, /facebook/, /analytics/, /gtm/, /cdn/],
  },
  NOON_FOOD: {
    menuPatterns: [/noon\.com\/api/, /food\.noon\.com/],
    authHeaders: ['authorization', 'cookie'],
    ignoredDomains: [/google/, /analytics/],
  },
}
