import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import { MenuItemCard } from '@/components/MenuItemCard'
import { Cart } from '@/components/Cart'
import { CartInitializer } from '@/components/CartInitializer'
import { Badge } from '@/components/ui/badge'
import type { MenuItemWithPrices, Platform } from '@/types'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ lat?: string; lng?: string }>
}

export default async function RestaurantPage({ params, searchParams }: Props) {
  const { id } = await params
  const sp = await searchParams
  const lat = parseFloat(sp.lat ?? '25.0805')
  const lng = parseFloat(sp.lng ?? '55.1403')

  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    include: {
      menuItems: {
        where: { isAvailable: true },
        include: {
          platformPrices: {
            where: { isAvailable: true },
          },
        },
        orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      },
    },
  })

  if (!restaurant) notFound()

  // Group items by category
  const categories = new Map<string, MenuItemWithPrices[]>()

  for (const item of restaurant.menuItems) {
    const category = item.category ?? 'Menu'
    if (!categories.has(category)) categories.set(category, [])

    const prices: Partial<Record<Platform, number>> = {}
    for (const price of item.platformPrices) {
      prices[price.platform as Platform] = price.price
    }

    categories.get(category)!.push({
      id: item.id,
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl,
      category: item.category,
      sortOrder: item.sortOrder,
      prices,
    })
  }

  const backParams = new URLSearchParams({ lat: String(lat), lng: String(lng) })

  return (
    <div className="flex flex-col min-h-screen pb-32">
      <CartInitializer
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
        restaurantSlug={restaurant.slug}
      />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 pt-12 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <Link
              href={`/restaurants?${backParams}`}
              className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-lg leading-tight">{restaurant.name}</h1>
              <p className="text-sm text-muted-foreground">{restaurant.address}</p>
            </div>
            {restaurant.logoUrl && (
              <div className="w-10 h-10 rounded-xl bg-muted overflow-hidden shrink-0">
                <Image
                  src={restaurant.logoUrl}
                  alt={restaurant.name}
                  width={40}
                  height={40}
                  className="object-contain p-1"
                />
              </div>
            )}
          </div>

          <Badge variant="secondary" className="text-xs">{restaurant.category}</Badge>
        </div>

        {/* Category nav */}
        {categories.size > 1 && (
          <div className="flex gap-3 px-4 pb-3 overflow-x-auto no-scrollbar">
            {Array.from(categories.keys()).map(cat => (
              <a
                key={cat}
                href={`#cat-${cat.replace(/\s+/g, '-')}`}
                className="text-sm font-medium text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
              >
                {cat}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Menu */}
      <div className="flex-1 px-4 py-6">
        {Array.from(categories.entries()).map(([category, items]) => (
          <section key={category} id={`cat-${category.replace(/\s+/g, '-')}`} className="mb-8">
            <h2 className="text-base font-bold mb-3 text-foreground">{category}</h2>
            <div>
              {items.map(item => (
                <MenuItemCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <Cart lat={lat} lng={lng} />
    </div>
  )
}
