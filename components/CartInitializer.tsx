'use client'

import { useEffect } from 'react'
import { useCartStore } from '@/store/cartStore'

interface Props {
  restaurantId: string
  restaurantName: string
  restaurantSlug: string
}

export function CartInitializer({ restaurantId, restaurantName, restaurantSlug }: Props) {
  const setRestaurant = useCartStore(s => s.setRestaurant)

  useEffect(() => {
    setRestaurant(restaurantId, restaurantName, restaurantSlug)
  }, [restaurantId, restaurantName, restaurantSlug, setRestaurant])

  return null
}
