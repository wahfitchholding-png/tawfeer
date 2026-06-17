import { Suspense } from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { compareCart } from '@/lib/comparison-engine'
import { PlatformCard } from '@/components/PlatformCard'
import { Skeleton } from '@/components/ui/skeleton'
import { PLATFORM_META } from '@/types'
import type { CartItem } from '@/types'

interface Props {
  searchParams: Promise<{
    restaurantId?: string
    lat?: string
    lng?: string
    cart?: string
  }>
}

async function ComparisonResults({
  restaurantId,
  cart,
}: {
  restaurantId: string
  cart: CartItem[]
}) {
  const results = await compareCart(restaurantId, cart)

  if (results.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="font-medium">No pricing data available yet.</p>
        <p className="text-sm mt-1">Data updates every 15 minutes.</p>
      </div>
    )
  }

  const available = results.filter(r => r.available)
  const cheapest = available[0]

  return (
    <div className="space-y-4">
      {cheapest && (
        <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4 text-sm">
          <p className="font-semibold text-primary">
            Order on {cheapest ? PLATFORM_META[cheapest.platform].label : '—'} to save the most
          </p>
          {cheapest.savings && cheapest.savings > 0 && (
            <p className="text-muted-foreground mt-0.5">
              You save {cheapest.savings.toFixed(0)} AED vs the most expensive option
            </p>
          )}
        </div>
      )}

      {results.map((result, i) => (
        <PlatformCard key={result.platform} result={result} rank={i + 1} />
      ))}
    </div>
  )
}

function ComparisonSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border p-5 space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-11 w-full" />
        </div>
      ))}
    </div>
  )
}

export default async function ComparePage({ searchParams }: Props) {
  const params = await searchParams
  const restaurantId = params.restaurantId
  const lat = parseFloat(params.lat ?? '25.0805')
  const lng = parseFloat(params.lng ?? '55.1403')

  let cart: CartItem[] = []
  try {
    cart = params.cart ? JSON.parse(params.cart) : []
  } catch {
    cart = []
  }

  const backParams = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  })

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 pt-12 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={restaurantId ? `/restaurant/${restaurantId}?${backParams}` : `/restaurants?${backParams}`}
            className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-bold text-lg">Price comparison</h1>
            <p className="text-sm text-muted-foreground">
              {cart.reduce((s, i) => s + i.quantity, 0)} item
              {cart.reduce((s, i) => s + i.quantity, 0) !== 1 ? 's' : ''} · All prices in AED
            </p>
          </div>
        </div>

        {/* Cart summary */}
        {cart.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {cart.map(item => (
              <span
                key={item.menuItemId}
                className="text-xs bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full"
              >
                {item.quantity}× {item.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 p-4">
        {!restaurantId || cart.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>No order to compare.</p>
            <Link href="/" className="text-primary text-sm underline mt-2 block">
              Start a new order
            </Link>
          </div>
        ) : (
          <Suspense fallback={<ComparisonSkeleton />}>
            <ComparisonResults restaurantId={restaurantId} cart={cart} />
          </Suspense>
        )}
      </div>
    </div>
  )
}
