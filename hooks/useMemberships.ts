'use client'

import { useState, useEffect } from 'react'
import type { Platform } from '@/types'

export type MembershipMap = Partial<Record<Platform, boolean>>

const STORAGE_KEY = 'tawfeer_memberships'

export function useMemberships() {
  const [memberships, setMembershipsState] = useState<MembershipMap>({})

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setMembershipsState(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [])

  const setMemberships = (next: MembershipMap) => {
    setMembershipsState(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }

  const toggle = (platform: Platform) => {
    const next = { ...memberships, [platform]: !memberships[platform] }
    setMemberships(next)
  }

  // Returns platforms where user is a member
  const memberPlatforms = Object.entries(memberships)
    .filter(([, v]) => v)
    .map(([k]) => k as Platform)

  // Returns URL-ready param string e.g. "TALABAT,CAREEM"
  const toParam = () => memberPlatforms.join(',')

  return { memberships, toggle, memberPlatforms, toParam }
}

// Reads membership param from URL and returns a Set
export function parseMembershipParam(param?: string): Set<Platform> {
  if (!param) return new Set()
  return new Set(param.split(',').filter(Boolean) as Platform[])
}
