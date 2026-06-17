'use client'

import { useRouter } from 'next/navigation'
import { ShoppingBag, ArrowRight, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/store/cartStore'
import { formatAED } from '@/lib/utils'

interface Props {
  lat: number
  lng: number
}

export function Cart({ lat, lng }: Props) {
  const { items, restaurantId, removeItem, updateQuantity, clearCart } = useCartStore()
  const router = useRouter()

  if (items.length === 0) return null

  const subtotal = items.reduce((sum, item) => sum + (item.basePrice ?? 0) * item.quantity, 0)
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  const handleCompare = () => {
    const params = new URLSearchParams({
      restaurantId: restaurantId!,
      lat: String(lat),
      lng: String(lng),
      cart: JSON.stringify(items.map(i => ({ menuItemId: i.menuItemId, name: i.name, quantity: i.quantity }))),
    })
    router.push(`/compare?${params}`)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur-sm border-t border-border shadow-2xl">
      <div className="max-w-md mx-auto space-y-3">
        {/* Item summary */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">{totalItems}</span>
            </div>
            <div>
              <p className="text-sm font-medium">{totalItems} item{totalItems !== 1 ? 's' : ''}</p>
              {subtotal > 0 && (
                <p className="text-xs text-muted-foreground">~{formatAED(subtotal)} before fees</p>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              if (confirm('Clear your cart?')) clearCart()
            }}
            className="text-muted-foreground hover:text-destructive transition-colors p-1"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <Button size="lg" className="w-full" onClick={handleCompare}>
          <ShoppingBag className="w-5 h-5" />
          Find cheapest delivery app
          <ArrowRight className="w-5 h-5 ml-auto" />
        </Button>
      </div>
    </div>
  )
}
