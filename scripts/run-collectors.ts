/**
 * Manual collector runner — use this to trigger scraping from the command line.
 *
 * Usage:
 *   npm run collect                          # all platforms, all restaurants
 *   npm run collect -- --platform=talabat   # single platform
 *   npm run collect -- --restaurant=mcdonalds
 *
 * In production, call POST /api/collect (with CRON_SECRET) from your cron provider
 * (Vercel Cron, GitHub Actions, Railway Cron, etc.)
 */

import { runAllCollectors, runCollector } from '@/lib/collectors/index'
import type { Platform } from '@/types'

const args = process.argv.slice(2)
const platformArg = args.find(a => a.startsWith('--platform='))?.split('=')[1]?.toUpperCase() as Platform | undefined
const restaurantArg = args.find(a => a.startsWith('--restaurant='))?.split('=')[1]

const slugs = restaurantArg
  ? [restaurantArg]
  : ['mcdonalds', 'kfc', 'burger-king', 'hardees', 'pizza-hut']

async function main() {
  console.log(`\n🚀 Starting collectors`)
  console.log(`   Restaurants: ${slugs.join(', ')}`)
  console.log(`   Platform: ${platformArg ?? 'all'}\n`)

  const results = platformArg
    ? await runCollector(platformArg, slugs)
    : await runAllCollectors(slugs)

  console.log('\n── Summary ──────────────────────────────')
  for (const r of results) {
    const status = r.success ? '✓' : '✗'
    console.log(`${status} ${r.platform.padEnd(10)} ${r.restaurantSlug.padEnd(15)} ${r.itemsUpdated} items  ${r.durationMs}ms`)
    if (r.error) console.log(`  Error: ${r.error}`)
  }

  const succeeded = results.filter(r => r.success).length
  console.log(`\nDone: ${succeeded}/${results.length} succeeded\n`)

  process.exit(succeeded === results.length ? 0 : 1)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
