import { NextRequest, NextResponse } from 'next/server'
import type { Platform } from '@/types'

const SUPPORTED_PLATFORMS: Platform[] = ['TALABAT', 'DELIVEROO', 'CAREEM', 'KEETA']
const DEFAULT_SLUGS = ['mcdonalds', 'kfc', 'burger-king', 'hardees', 'pizza-hut']

export async function POST(request: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const platforms: Platform[] = body.platforms ?? SUPPORTED_PLATFORMS
  const slugs: string[] = body.slugs ?? DEFAULT_SLUGS

  // Dynamic import so Playwright isn't bundled client-side
  const { runCollector } = await import('@/lib/collectors/index')

  const startTime = Date.now()
  const allResults: Awaited<ReturnType<typeof runCollector>> = []

  for (const platform of platforms) {
    try {
      const results = await runCollector(platform, slugs)
      allResults.push(...results)
    } catch (err) {
      console.error(`Collector failed for ${platform}:`, err)
    }
  }

  const summary = {
    durationMs: Date.now() - startTime,
    total: allResults.length,
    succeeded: allResults.filter(r => r.success).length,
    failed: allResults.filter(r => !r.success).length,
    results: allResults,
  }

  console.log(`[collect] Done in ${summary.durationMs}ms — ${summary.succeeded}/${summary.total} succeeded`)
  return NextResponse.json(summary)
}
