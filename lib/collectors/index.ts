import type { Platform } from '@/types'
import type { PlatformCollector, CollectorLocation, CollectorRunResult } from './types'
import { TalabatCollector } from './talabat'
import { DeliverooCollector } from './deliveroo'
import { CareemCollector } from './careem'
import { KeetaCollector } from './keeta'
import { prisma } from '@/lib/prisma'

const collectors: Record<string, PlatformCollector> = {
  TALABAT: new TalabatCollector(),
  DELIVEROO: new DeliverooCollector(),
  CAREEM: new CareemCollector(),
  KEETA: new KeetaCollector(),
}

const DUBAI_MARINA_LOCATION: CollectorLocation = {
  lat: 25.0805,
  lng: 55.1403,
  area: 'Dubai Marina',
}

export async function runCollector(
  platform: Platform,
  restaurantSlugs: string[],
  location: CollectorLocation = DUBAI_MARINA_LOCATION
): Promise<CollectorRunResult[]> {
  const collector = collectors[platform]
  if (!collector) throw new Error(`No collector registered for platform: ${platform}`)

  const results: CollectorRunResult[] = []

  for (const slug of restaurantSlugs) {
    const start = Date.now()

    try {
      console.log(`[${platform}] Collecting ${slug}...`)
      const data = await collector.collect(slug, location)
      const durationMs = Date.now() - start

      // Find the restaurant in DB
      const restaurant = await prisma.restaurant.findUnique({ where: { slug } })
      if (!restaurant) {
        console.warn(`[${platform}] Restaurant not found in DB: ${slug}`)
        results.push({ platform, restaurantSlug: slug, success: false, itemsUpdated: 0, durationMs, error: 'Not in DB' })
        continue
      }

      // Upsert platform link
      await prisma.platformRestaurantLink.upsert({
        where: { restaurantId_platform: { restaurantId: restaurant.id, platform } },
        update: {
          platformRestaurantId: data.platformRestaurantId,
          deepLinkUrl: data.deepLinkUrl,
          webUrl: data.webUrl,
          isAvailable: data.isAvailable,
          updatedAt: new Date(),
        },
        create: {
          restaurantId: restaurant.id,
          platform,
          platformRestaurantId: data.platformRestaurantId,
          deepLinkUrl: data.deepLinkUrl,
          webUrl: data.webUrl,
          isAvailable: data.isAvailable,
          updatedAt: new Date(),
        },
      })

      // Upsert delivery fees
      await prisma.deliveryFee.upsert({
        where: { platform_restaurantId: { platform, restaurantId: restaurant.id } },
        update: { ...data.deliveryInfo, updatedAt: new Date() },
        create: { platform, restaurantId: restaurant.id, ...data.deliveryInfo, updatedAt: new Date() },
      })

      // Match collected items to DB menu items and upsert prices
      let itemsUpdated = 0
      const dbMenuItems = await prisma.menuItem.findMany({ where: { restaurantId: restaurant.id } })

      for (const collectedItem of data.menuItems) {
        const dbItem = dbMenuItems.find(
          i => normalizeItemName(i.name) === normalizeItemName(collectedItem.name)
        )
        if (!dbItem) continue

        await prisma.platformPrice.upsert({
          where: { menuItemId_platform: { menuItemId: dbItem.id, platform } },
          update: {
            price: collectedItem.price,
            originalPrice: collectedItem.originalPrice,
            isAvailable: collectedItem.isAvailable,
            updatedAt: new Date(),
          },
          create: {
            menuItemId: dbItem.id,
            platform,
            price: collectedItem.price,
            originalPrice: collectedItem.originalPrice,
            isAvailable: collectedItem.isAvailable,
            updatedAt: new Date(),
          },
        })
        itemsUpdated++
      }

      // Log to DB
      await prisma.collectorLog.create({
        data: {
          platform,
          restaurantId: restaurant.id,
          status: 'success',
          itemsUpdated,
          durationMs,
        },
      })

      results.push({ platform, restaurantSlug: slug, success: true, itemsUpdated, durationMs })
      console.log(`[${platform}] ${slug}: ${itemsUpdated} items updated in ${durationMs}ms`)
    } catch (err) {
      const durationMs = Date.now() - start
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error(`[${platform}] ${slug} failed: ${errorMessage}`)

      await prisma.collectorLog.create({
        data: { platform, status: 'error', errorMessage, durationMs },
      })

      results.push({ platform, restaurantSlug: slug, success: false, itemsUpdated: 0, durationMs, error: errorMessage })
    }
  }

  return results
}

export async function runAllCollectors(
  restaurantSlugs: string[],
  location: CollectorLocation = DUBAI_MARINA_LOCATION
): Promise<CollectorRunResult[]> {
  const platforms: Platform[] = ['TALABAT', 'DELIVEROO', 'CAREEM', 'KEETA']

  const allResults = await Promise.allSettled(
    platforms.map(p => runCollector(p, restaurantSlugs, location))
  )

  return allResults.flatMap(r => (r.status === 'fulfilled' ? r.value : []))
}

function normalizeItemName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').trim()
}
