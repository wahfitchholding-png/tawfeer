'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MapPin, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDistance } from '@/lib/utils'
import { PLATFORM_META } from '@/types'
import type { RestaurantSummary, Platform } from '@/types'

interface Props {
  restaurant: RestaurantSummary
  lat: number
  lng: number
}

const CATEGORY_COLORS: Record<string, string> = {
  'Fast Food': 'bg-orange-50 text-orange-700',
  Pizza: 'bg-red-50 text-red-700',
  Burgers: 'bg-yellow-50 text-yellow-700',
  Chicken: 'bg-amber-50 text-amber-700',
}

export function RestaurantCard({ restaurant, lat, lng }: Props) {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng) })

  return (
    <Link href={`/restaurant/${restaurant.id}?${params}`}>
      <Card className="active:scale-[0.98] transition-transform cursor-pointer hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {restaurant.logoUrl ? (
                <Image
                  src={restaurant.logoUrl}
                  alt={restaurant.name}
                  width={64}
                  height={64}
                  className="object-contain p-1"
                />
              ) : (
                <span className="text-2xl font-bold text-muted-foreground">
                  {restaurant.name[0]}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-foreground truncate">{restaurant.name}</h3>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>

              <div className="flex items-center gap-1.5 mt-1">
                <Badge
                  className={`text-xs ${CATEGORY_COLORS[restaurant.category] ?? 'bg-secondary text-secondary-foreground'}`}
                  variant="outline"
                >
                  {restaurant.category}
                </Badge>
                {restaurant.distance !== undefined && (
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" />
                    {formatDistance(restaurant.distance)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 mt-2 flex-wrap">
                {restaurant.availableOn.map((platform: Platform) => (
                  <span
                    key={platform}
                    className="text-xs px-1.5 py-0.5 rounded-md font-medium flex items-center gap-1"
                    style={{
                      backgroundColor: PLATFORM_META[platform].bgColor,
                      color: PLATFORM_META[platform].textColor,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: PLATFORM_META[platform].primaryColor }}
                    />
                    {PLATFORM_META[platform].label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
