import type { Platform } from '@/types'

export interface CollectorLocation {
  lat: number
  lng: number
  area?: string
}

export interface CollectedMenuItem {
  platformItemId: string
  name: string
  price: number
  originalPrice?: number
  description?: string
  imageUrl?: string
  category?: string
  isAvailable: boolean
}

export interface CollectedDeliveryInfo {
  baseFee: number
  serviceFeePercent: number
  serviceFeeFlat: number
  smallOrderThreshold?: number
  smallOrderFee?: number
  freeDeliveryThreshold?: number
  estimatedMinutes: number
}

export interface CollectedPromotion {
  type: 'PERCENTAGE_OFF' | 'FLAT_OFF' | 'FREE_DELIVERY' | 'BOGO'
  value: number
  minOrder?: number
  maxDiscount?: number
  description: string
  code?: string
  validUntil?: Date
}

export interface CollectorResult {
  restaurantSlug: string
  platformRestaurantId: string
  deepLinkUrl: string
  webUrl: string
  isAvailable: boolean
  menuItems: CollectedMenuItem[]
  deliveryInfo: CollectedDeliveryInfo
  promotions: CollectedPromotion[]
}

export interface PlatformCollector {
  readonly platform: Platform
  collect(restaurantSlug: string, location: CollectorLocation): Promise<CollectorResult>
}

export interface CollectorRunResult {
  platform: Platform
  restaurantSlug: string
  success: boolean
  itemsUpdated: number
  durationMs: number
  error?: string
}
