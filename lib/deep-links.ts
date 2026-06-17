import type { Platform } from '@/types'

interface DeepLinkOptions {
  restaurantSlug: string
  webUrl: string
  platform: Platform
}

export function buildDeepLink({ platform, restaurantSlug, webUrl }: DeepLinkOptions): string {
  // These web URLs work as universal links on mobile — the OS opens the native app
  // if installed, otherwise falls back to the browser. No custom scheme needed.
  switch (platform) {
    case 'TALABAT':
      return webUrl || `https://www.talabat.com/uae/search?q=${encodeURIComponent(restaurantSlug)}`
    case 'DELIVEROO':
      return webUrl || `https://deliveroo.ae/`
    case 'CAREEM':
      return webUrl || `https://www.careem.com/en-ae/food/`
    case 'KEETA':
      return webUrl || `https://www.keeta.com/ae/`
    case 'NOON_FOOD':
      return webUrl || `https://food.noon.com/`
    default:
      return webUrl
  }
}

export function getPlatformStoreLinks(platform: Platform): { ios: string; android: string } {
  const links: Record<Platform, { ios: string; android: string }> = {
    TALABAT: {
      ios: 'https://apps.apple.com/ae/app/talabat-food-delivery/id294923083',
      android: 'https://play.google.com/store/apps/details?id=com.talabat',
    },
    DELIVEROO: {
      ios: 'https://apps.apple.com/ae/app/deliveroo-food-delivery/id1001501679',
      android: 'https://play.google.com/store/apps/details?id=com.deliveroo.orderapp',
    },
    CAREEM: {
      ios: 'https://apps.apple.com/ae/app/careem/id592978487',
      android: 'https://play.google.com/store/apps/details?id=com.careem.acma',
    },
    KEETA: {
      ios: 'https://apps.apple.com/ae/app/keeta-food-delivery/id6467370547',
      android: 'https://play.google.com/store/apps/details?id=com.keeta.customer',
    },
    NOON_FOOD: {
      ios: 'https://apps.apple.com/ae/app/noon-food/id6446145282',
      android: 'https://play.google.com/store/apps/details?id=com.noon.food',
    },
  }
  return links[platform]
}
