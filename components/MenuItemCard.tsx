'use client'

import { Plus, Minus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/store/cartStore'
import { formatAED } from '@/lib/utils'
import type { MenuItemWithPrices } from '@/types'

interface Props {
  item: MenuItemWithPrices
}

export function MenuItemCard({ item }: Props) {
  const { items, addItem, updateQuantity, removeItem } = useCartStore()
  const cartItem = items.find(i => i.menuItemId === item.id)
  const quantity = cartItem?.quantity ?? 0

  // Show the lowest price across platforms as a reference
  const prices = Object.values(item.prices).filter((p): p is number => typeof p === 'number')
  const lowestPrice = prices.length > 0 ? Math.min(...prices) : null
  const highestPrice = prices.length > 0 ? Math.max(...prices) : null
  const hasVariation = lowestPrice !== null && highestPrice !== null && lowestPrice !== highestPrice

  return (
    <div className="flex items-center gap-4 py-4 border-b border-border last:border-0">
      {/* Item image placeholder */}
      <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center shrink-0 text-2xl">
        {getItemEmoji(item.name)}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm">{item.name}</p>
        {item.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
        )}
        {lowestPrice !== null && (
          <div className="mt-1 flex items-center gap-1">
            <span className="text-sm font-semibold text-foreground">
              {hasVariation ? `${formatAED(lowestPrice)} –` : formatAED(lowestPrice)}
            </span>
            {hasVariation && highestPrice !== null && (
              <span className="text-sm font-semibold text-foreground">{formatAED(highestPrice)}</span>
            )}
            {hasVariation && (
              <span className="text-xs text-muted-foreground ml-0.5">across apps</span>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0">
        {quantity === 0 ? (
          <Button
            size="icon"
            onClick={() =>
              addItem({
                menuItemId: item.id,
                name: item.name,
                quantity: 1,
                basePrice: lowestPrice ?? undefined,
              })
            }
            className="w-9 h-9 rounded-xl"
          >
            <Plus className="w-4 h-4" />
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              onClick={() => {
                if (quantity === 1) {
                  removeItem(item.id)
                } else {
                  updateQuantity(item.id, quantity - 1)
                }
              }}
              className="w-9 h-9 rounded-xl"
            >
              {quantity === 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-4 h-4" />}
            </Button>
            <span className="w-5 text-center font-semibold text-sm">{quantity}</span>
            <Button
              size="icon"
              onClick={() => updateQuantity(item.id, quantity + 1)}
              className="w-9 h-9 rounded-xl"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function getItemEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('burger') || n.includes('whopper') || n.includes('mac')) return '🍔'
  if (n.includes('chicken') || n.includes('zinger') || n.includes('nugget') || n.includes('wing')) return '🍗'
  if (n.includes('pizza')) return '🍕'
  if (n.includes('fries') || n.includes('wedge')) return '🍟'
  if (n.includes('ice cream') || n.includes('mcflurry') || n.includes('sundae')) return '🍦'
  if (n.includes('shake') || n.includes('smoothie')) return '🥤'
  if (n.includes('pie') || n.includes('cake') || n.includes('cookie')) return '🥧'
  if (n.includes('coffee') || n.includes('latte') || n.includes('cappuccino')) return '☕'
  if (n.includes('salad')) return '🥗'
  if (n.includes('wrap') || n.includes('sandwich')) return '🌯'
  if (n.includes('fish') || n.includes('fillet')) return '🐟'
  if (n.includes('meal') || n.includes('combo') || n.includes('bucket')) return '🍱'
  return '🍽️'
}
