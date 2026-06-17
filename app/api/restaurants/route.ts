import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { haversineDistance } from '@/lib/utils'
import type { Platform } from '@/types'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const lat = parseFloat(searchParams.get('lat') ?? '')
  const lng = parseFloat(searchParams.get('lng') ?? '')
  const radiusKm = parseFloat(searchParams.get('radius') ?? '10')
  const q = searchParams.get('q')

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
  }

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
  })

  const nearby = restaurants
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
    .filter(r => r.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance)

  return NextResponse.json({ restaurants: nearby })
}
