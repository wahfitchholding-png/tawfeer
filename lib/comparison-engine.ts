import type { CartItem, Platform, PlatformResult } from '@/types'
import { prisma } from './prisma'
import { ACTIVE_PLATFORMS } from '@/types'

export async function compareCart(
  restaurantId: string,
  cart: CartItem[],
  memberships: Set<Platform> = new Set()
): Promise<PlatformResult[]> {
  if (cart.length === 0) return []

  const menuItemIds = cart.map(i => i.menuItemId)

  const [platformPrices, deliveryFees, platformLinks, promotions] = await Promise.all([
    prisma.platformPrice.findMany({
      where: { menuItemId: { in: menuItemIds } },
    }),
    prisma.deliveryFee.findMany({
      where: { restaurantId },
    }),
    prisma.platformRestaurantLink.findMany({
      where: { restaurantId },
    }),
    prisma.promotion.findMany({
      where: {
        AND: [
          { OR: [{ restaurantId }, { restaurantId: null }] },
          { isActive: true },
          { OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }] },
        ],
      },
    }),
  ])

  const results: PlatformResult[] = []

  for (const platform of ACTIVE_PLATFORMS as Platform[]) {
    const link = platformLinks.find(l => l.platform === platform)
    const deliveryInfo = deliveryFees.find(d => d.platform === platform)

    if (!link || !link.isAvailable || !deliveryInfo) {
      if (link) {
        results.push(unavailableResult(platform, link.deepLinkUrl))
      }
      continue
    }

    // Calculate items total — if any item is unavailable, skip this platform
    let itemsTotal = 0
    let skip = false

    for (const cartItem of cart) {
      const priceRecord = platformPrices.find(
        p => p.menuItemId === cartItem.menuItemId && p.platform === platform
      )
      if (!priceRecord || !priceRecord.isAvailable) {
        skip = true
        break
      }
      itemsTotal += priceRecord.price * cartItem.quantity
    }

    if (skip) {
      results.push(unavailableResult(platform, link.deepLinkUrl))
      continue
    }

    // Members get free delivery
    const deliveryFee = memberships.has(platform) ? 0 : deliveryInfo.baseFee
    const serviceFee =
      deliveryInfo.serviceFeeFlat +
      (itemsTotal * deliveryInfo.serviceFeePercent) / 100

    const smallOrderFee =
      deliveryInfo.smallOrderThreshold && itemsTotal < deliveryInfo.smallOrderThreshold
        ? (deliveryInfo.smallOrderFee ?? 0)
        : 0

    // Find best applicable promotion
    const platformPromos = promotions.filter(p => p.platform === platform)
    let discount = 0

    for (const promo of platformPromos) {
      if (promo.minOrder && itemsTotal < promo.minOrder) continue

      let promoDiscount = 0
      switch (promo.type) {
        case 'PERCENTAGE_OFF':
          promoDiscount = (itemsTotal * promo.value) / 100
          if (promo.maxDiscount) promoDiscount = Math.min(promoDiscount, promo.maxDiscount)
          break
        case 'FLAT_OFF':
          promoDiscount = promo.value
          break
        case 'FREE_DELIVERY':
          promoDiscount = deliveryFee
          break
        case 'BOGO':
          promoDiscount = itemsTotal / 2
          break
      }

      discount = Math.max(discount, promoDiscount)
    }

    const total = Math.max(0, itemsTotal + deliveryFee + serviceFee + smallOrderFee - discount)

    results.push({
      platform,
      available: true,
      itemsTotal,
      deliveryFee,
      serviceFee: parseFloat(serviceFee.toFixed(2)),
      smallOrderFee,
      discount: parseFloat(discount.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      estimatedMinutes: deliveryInfo.estimatedMinutes,
      deepLinkUrl: link.deepLinkUrl,
      isMember: memberships.has(platform),
    })
  }

  // Sort available results by total price (cheapest first)
  const available = results.filter(r => r.available).sort((a, b) => a.total - b.total)
  const unavailable = results.filter(r => !r.available)

  // Annotate savings on cheapest vs most expensive
  if (available.length >= 2) {
    const cheapestTotal = available[0].total
    const mostExpensiveTotal = available[available.length - 1].total
    available[0].savings = parseFloat((mostExpensiveTotal - cheapestTotal).toFixed(2))
  }

  return [...available, ...unavailable]
}

function unavailableResult(platform: Platform, deepLinkUrl: string): PlatformResult {
  return {
    platform,
    available: false,
    itemsTotal: 0,
    deliveryFee: 0,
    serviceFee: 0,
    smallOrderFee: 0,
    discount: 0,
    total: 0,
    estimatedMinutes: 0,
    deepLinkUrl,
  }
}
