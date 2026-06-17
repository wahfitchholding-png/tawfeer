import { NextRequest, NextResponse } from 'next/server'
import { compareCart } from '@/lib/comparison-engine'
import type { CartItem } from '@/types'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { restaurantId, cart } = body as { restaurantId: string; cart: CartItem[] }

  if (!restaurantId || !Array.isArray(cart) || cart.length === 0) {
    return NextResponse.json({ error: 'restaurantId and cart[] are required' }, { status: 400 })
  }

  const results = await compareCart(restaurantId, cart)
  return NextResponse.json({ results })
}
