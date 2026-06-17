import { Suspense } from 'react'
import Link from 'next/link'
import { Search, MapPin, ArrowLeft } from 'lucide-react'
import { MembershipSettings } from '@/components/MembershipSettings'
import { prisma } from '@/lib/prisma'
import { haversineDistance } from '@/lib/utils'
import { RestaurantCard } from '@/components/RestaurantCard'
import { DiscoveryLoader } from '@/components/DiscoveryLoader'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { RestaurantSummary, Platform } from '@/types'

interface Props {
  searchParams: Promise<{ lat?: string; lng?: string; area?: string; q?: string }>
}

async function RestaurantList({ lat, lng, q }: { lat: number; lng: number; q?: string }) {
  const restaurants = await prisma.restaurant.findMany({
    where: {
      isActive: true,
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
    },
    include: {
      platformLinks: {
        where: { isAvailable: true },
        select: { platform: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Filter by radius (10km) and add distance
  const nearby: (RestaurantSummary & { distance: number })[] = restaurants
    .map(r => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      category: r.category,
      logoUrl: r.logoUrl,
      lat: r.lat,
      lng: r.lng,
      address: r.address,
      distance: haversineDistance(lat, lng, r.lat, r.lng),
      availableOn: r.platformLinks.map(l => l.platform as Platform),
    }))
    .filter(r => r.distance <= 5)
    .sort((a, b) => a.distance - b.distance)

  if (nearby.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg font-medium">No restaurants found nearby</p>
        <p className="text-sm mt-1">Try searching or check back later</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {nearby.map(r => (
        <RestaurantCard key={r.id} restaurant={r} lat={lat} lng={lng} />
      ))}
    </div>
  )
}

async function RestaurantListWithDiscovery({ lat, lng, q }: { lat: number; lng: number; q?: string }) {
  // Count how many restaurants we have near this location right now
  const all = await prisma.restaurant.findMany({
    where: { isActive: true },
    select: { lat: true, lng: true },
  })
  const nearbyCount = all.filter(r => haversineDistance(lat, lng, r.lat, r.lng) <= 5).length

  return (
    <>
      <DiscoveryLoader lat={lat} lng={lng} nearbyCount={nearbyCount} />
      <RestaurantList lat={lat} lng={lng} q={q} />
    </>
  )
}

function RestaurantSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border p-4 flex gap-4">
          <Skeleton className="w-16 h-16 rounded-2xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-40" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default async function RestaurantsPage({ searchParams }: Props) {
  const params = await searchParams
  const lat = parseFloat(params.lat ?? '25.0805')
  const lng = parseFloat(params.lng ?? '55.1403')
  const area = params.area ?? 'Dubai'
  const q = params.q

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 pt-12 pb-4 space-y-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Nearby restaurants</h1>
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              <span className="text-sm">{area}</span>
            </div>
          </div>
        </div>

        <form action="/restaurants" method="GET">
          <input type="hidden" name="lat" value={lat} />
          <input type="hidden" name="lng" value={lng} />
          <input type="hidden" name="area" value={area} />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Search restaurants near you"
              className="pl-10"
            />
          </div>
        </form>
      </div>

      <div className="flex-1 p-4 space-y-4">
        <MembershipSettings />
        <Suspense fallback={<RestaurantSkeleton />}>
          <RestaurantListWithDiscovery lat={lat} lng={lng} q={q} />
        </Suspense>
      </div>
    </div>
  )
}
