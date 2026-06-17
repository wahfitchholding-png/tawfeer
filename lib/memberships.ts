import type { Platform } from '@/types'

export function parseMembershipParam(param?: string): Set<Platform> {
  if (!param) return new Set()
  return new Set(param.split(',').filter(Boolean) as Platform[])
}
