import { NextRequest, NextResponse } from 'next/server'
import { listCredentialStatus, saveCredentials, invalidateCredentials, getDiscoveredEndpoint } from '@/lib/api-clients/credentials'
import type { Platform } from '@/types'

function requireAuth(request: NextRequest): boolean {
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

/** GET /api/credentials — show status of all stored credentials */
export async function GET(request: NextRequest) {
  if (!requireAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const status = await listCredentialStatus()

  const platforms: Platform[] = ['TALABAT', 'DELIVEROO', 'CAREEM', 'KEETA']
  const endpoints = await Promise.all(
    platforms.map(async p => ({
      platform: p,
      menuEndpoint: await getDiscoveredEndpoint(p, 'mcdonalds', 'menu'),
    }))
  )

  return NextResponse.json({ credentials: status, discoveredEndpoints: endpoints })
}

/**
 * POST /api/credentials — manually inject credentials captured via Chrome DevTools or mitmproxy
 *
 * Body: {
 *   platform: "TALABAT" | "DELIVEROO" | "CAREEM" | "KEETA",
 *   credentials: { "authorization": "Bearer xxx", "x-roo-guid": "...", ... },
 *   ttlHours: 6  // optional, defaults to 6
 * }
 */
export async function POST(request: NextRequest) {
  if (!requireAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { platform, credentials, ttlHours = 6 } = body as {
    platform: Platform
    credentials: Record<string, string>
    ttlHours?: number
  }

  if (!platform || !credentials || typeof credentials !== 'object') {
    return NextResponse.json({ error: 'platform and credentials are required' }, { status: 400 })
  }

  await saveCredentials(platform, credentials, ttlHours * 60 * 60 * 1000)

  return NextResponse.json({
    ok: true,
    platform,
    keysStored: Object.keys(credentials),
    expiresInHours: ttlHours,
  })
}

/**
 * DELETE /api/credentials?platform=TALABAT — invalidate credentials for a platform
 */
export async function DELETE(request: NextRequest) {
  if (!requireAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const platform = request.nextUrl.searchParams.get('platform') as Platform | null
  if (!platform) {
    return NextResponse.json({ error: 'platform query param required' }, { status: 400 })
  }

  await invalidateCredentials(platform)
  return NextResponse.json({ ok: true, invalidated: platform })
}
