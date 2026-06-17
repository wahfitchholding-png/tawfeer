import { prisma } from '@/lib/prisma'
import type { Platform } from '@/types'
import type { StoredCredentials } from './types'

const CREDENTIAL_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours — most session tokens last this long

export async function getCredentials(platform: Platform): Promise<StoredCredentials | null> {
  const rows = await prisma.platformCredential.findMany({
    where: {
      platform,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  })

  if (rows.length === 0) return null
  return Object.fromEntries(rows.map(r => [r.key, r.value]))
}

export async function saveCredentials(
  platform: Platform,
  credentials: StoredCredentials,
  ttlMs: number = CREDENTIAL_TTL_MS
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlMs)

  await Promise.all(
    Object.entries(credentials).map(([key, value]) =>
      prisma.platformCredential.upsert({
        where: { platform_key: { platform, key } },
        update: { value, expiresAt, updatedAt: new Date() },
        create: { platform, key, value, expiresAt, updatedAt: new Date() },
      })
    )
  )

  console.log(`[credentials] Saved ${Object.keys(credentials).length} keys for ${platform}, expires ${expiresAt.toISOString()}`)
}

export async function invalidateCredentials(platform: Platform): Promise<void> {
  await prisma.platformCredential.updateMany({
    where: { platform },
    data: { expiresAt: new Date(0) },
  })
}

export async function saveDiscoveredEndpoint(
  platform: Platform,
  slug: string,
  endpointType: 'menu' | 'delivery' | 'restaurant' | 'search',
  url: string,
  method = 'GET',
  sampleResponse?: string
): Promise<void> {
  await prisma.discoveredEndpoint.upsert({
    where: { platform_slug_endpointType: { platform, slug, endpointType } },
    update: { url, method, sampleResponse, updatedAt: new Date() },
    create: { platform, slug, endpointType, url, method, sampleResponse, updatedAt: new Date() },
  })
}

export async function getDiscoveredEndpoint(
  platform: Platform,
  slug: string,
  endpointType: 'menu' | 'delivery' | 'restaurant' | 'search'
): Promise<string | null> {
  const row = await prisma.discoveredEndpoint.findUnique({
    where: { platform_slug_endpointType: { platform, slug, endpointType } },
  })
  return row?.url ?? null
}

export async function listCredentialStatus(): Promise<
  Array<{ platform: Platform; keys: string[]; expiresAt: Date | null; isValid: boolean }>
> {
  const all = await prisma.platformCredential.findMany({
    orderBy: [{ platform: 'asc' }, { key: 'asc' }],
  })

  const byPlatform = new Map<Platform, typeof all>()
  for (const row of all) {
    const existing = byPlatform.get(row.platform) ?? []
    byPlatform.set(row.platform, [...existing, row])
  }

  return Array.from(byPlatform.entries()).map(([platform, rows]) => ({
    platform,
    keys: rows.map(r => r.key),
    expiresAt: rows[0]?.expiresAt ?? null,
    isValid: rows.every(r => !r.expiresAt || r.expiresAt > new Date()),
  }))
}
