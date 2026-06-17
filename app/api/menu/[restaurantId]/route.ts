import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { MenuItemWithPrices, Platform } from '@/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  const { restaurantId } = await params

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    include: {
      menuItems: {
        where: { isAvailable: true },
        include: {
          platformPrices: { where: { isAvailable: true } },
        },
        orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
      },
    },
  })

  if (!restaurant) {
    return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
  }

  const menuItems: MenuItemWithPrices[] = restaurant.menuItems.map(item => ({
    id: item.id,
    name: item.name,
    description: item.description,
    imageUrl: item.imageUrl,
    category: item.category,
    sortOrder: item.sortOrder,
    prices: Object.fromEntries(
      item.platformPrices.map(p => [p.platform as Platform, p.price])
    ) as Partial<Record<Platform, number>>,
  }))

  return NextResponse.json({ restaurant: { id: restaurant.id, name: restaurant.name }, menuItems })
}
