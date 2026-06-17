export type Platform = 'TALABAT' | 'DELIVEROO' | 'CAREEM' | 'KEETA' | 'NOON_FOOD'

export interface Location {
  lat: number
  lng: number
}

export interface CartItem {
  menuItemId: string
  name: string
  quantity: number
  basePrice?: number
}

export interface PlatformResult {
  platform: Platform
  available: boolean
  itemsTotal: number
  deliveryFee: number
  serviceFee: number
  smallOrderFee: number
  discount: number
  total: number
  estimatedMinutes: number
  deepLinkUrl: string
  savings?: number
}

export interface RestaurantSummary {
  id: string
  name: string
  slug: string
  category: string
  logoUrl: string | null
  lat: number
  lng: number
  address: string | null
  distance?: number
  availableOn: Platform[]
}

export interface MenuItemWithPrices {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  category: string | null
  sortOrder: number
  prices: Partial<Record<Platform, number>>
}

export const PLATFORM_META: Record<Platform, {
  label: string
  primaryColor: string
  bgColor: string
  textColor: string
  appScheme: string
}> = {
  TALABAT: {
    label: 'Talabat',
    primaryColor: '#FF6B00',
    bgColor: '#FFF3EB',
    textColor: '#CC5500',
    appScheme: 'talabat',
  },
  DELIVEROO: {
    label: 'Deliveroo',
    primaryColor: '#00CCBC',
    bgColor: '#E6FAF9',
    textColor: '#008C80',
    appScheme: 'deliveroo',
  },
  CAREEM: {
    label: 'Careem',
    primaryColor: '#1DBF73',
    bgColor: '#E8FFF3',
    textColor: '#168A52',
    appScheme: 'careem',
  },
  KEETA: {
    label: 'Keeta',
    primaryColor: '#1A1A1A',
    bgColor: '#FFF8D6',
    textColor: '#1A1A1A',
    appScheme: 'keeta',
  },
  NOON_FOOD: {
    label: 'Noon Food',
    primaryColor: '#FECC00',
    bgColor: '#FFFBE6',
    textColor: '#B89200',
    appScheme: 'noon',
  },
}

export const ACTIVE_PLATFORMS: Platform[] = ['TALABAT', 'DELIVEROO', 'CAREEM', 'KEETA', 'NOON_FOOD']
