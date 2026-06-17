import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { haversineDistance } from '@/lib/utils'

// Track in-progress discoveries (key = "lat:lng" rounded to 2dp)
const activeDiscoveries = new Set<string>()

function locationKey(lat: number, lng: number) {
  return `${lat.toFixed(2)}:${lng.toFixed(2)}`
}

export async function POST(request: NextRequest) {
  const { lat, lng } = await request.json() as { lat: number; lng: number }

  if (!lat || !lng) return NextResponse.json({ error: 'lat and lng required' }, { status: 400 })

  const key = locationKey(lat, lng)

  if (activeDiscoveries.has(key)) {
    return NextResponse.json({ status: 'already_running' })
  }

  // Check if we already have fresh data for this location (within 6 hours)
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000)
  const recent = await prisma.collectorLog.findFirst({
    where: { status: 'discovery_complete', createdAt: { gt: sixHoursAgo } },
    orderBy: { createdAt: 'desc' },
  })
  if (recent) {
    return NextResponse.json({ status: 'already_fresh' })
  }

  activeDiscoveries.add(key)

  // Fire and forget — do NOT await
  runDiscovery(lat, lng, key).catch(err => {
    console.error('[DISCOVER] Background job failed:', err)
    activeDiscoveries.delete(key)
  })

  return NextResponse.json({ status: 'started' })
}

async function runDiscovery(lat: number, lng: number, key: string) {
  try {
    const { discoverRestaurantsAtLocation } = await import('@/lib/collectors/restaurant-list')
    const count = await discoverRestaurantsAtLocation(lat, lng)

    await prisma.collectorLog.create({
      data: {
        platform: 'TALABAT',
        status: 'discovery_complete',
        itemsUpdated: count,
        durationMs: 0,
      },
    })
  } finally {
    activeDiscoveries.delete(key)
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') ?? '0')
  const lng = parseFloat(searchParams.get('lng') ?? '0')

  const key = locationKey(lat, lng)
  const isRunning = activeDiscoveries.has(key)

  // Count restaurants near this location
  const all = await prisma.restaurant.findMany({
    where: { isActive: true },
    select: { lat: true, lng: true },
  })
  const nearby = all.filter(r => haversineDistance(lat, lng, r.lat, r.lng) <= 5).length

  return NextResponse.json({
    status: isRunning ? 'running' : 'idle',
    nearbyCount: nearby,
  })
}
