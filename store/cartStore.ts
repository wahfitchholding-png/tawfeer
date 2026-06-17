'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from '@/types'

interface CartState {
  restaurantId: string | null
  restaurantName: string | null
  restaurantSlug: string | null
  items: CartItem[]
  setRestaurant: (id: string, name: string, slug: string) => void
  addItem: (item: CartItem) => void
  removeItem: (menuItemId: string) => void
  updateQuantity: (menuItemId: string, quantity: number) => void
  clearCart: () => void
  totalItems: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      restaurantId: null,
      restaurantName: null,
      restaurantSlug: null,
      items: [],

      setRestaurant: (id, name, slug) => {
        const currentId = get().restaurantId
        if (currentId && currentId !== id) {
          // Switching restaurants — clear the cart
          set({ restaurantId: id, restaurantName: name, restaurantSlug: slug, items: [] })
        } else {
          set({ restaurantId: id, restaurantName: name, restaurantSlug: slug })
        }
      },

      addItem: (item) => {
        set(state => {
          const existing = state.items.find(i => i.menuItemId === item.menuItemId)
          if (existing) {
            return {
              items: state.items.map(i =>
                i.menuItemId === item.menuItemId
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            }
          }
          return { items: [...state.items, { ...item, quantity: 1 }] }
        })
      },

      removeItem: (menuItemId) => {
        set(state => ({
          items: state.items.filter(i => i.menuItemId !== menuItemId),
        }))
      },

      updateQuantity: (menuItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(menuItemId)
          return
        }
        set(state => ({
          items: state.items.map(i =>
            i.menuItemId === menuItemId ? { ...i, quantity } : i
          ),
        }))
      },

      clearCart: () => set({ items: [], restaurantId: null, restaurantName: null, restaurantSlug: null }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: 'delivery-compare-cart',
    }
  )
)
