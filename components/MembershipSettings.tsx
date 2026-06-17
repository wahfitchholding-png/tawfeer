'use client'

import { useState } from 'react'
import { BadgeCheck, ChevronDown, ChevronUp } from 'lucide-react'
import { PLATFORM_META, ACTIVE_PLATFORMS } from '@/types'
import type { Platform } from '@/types'
import { useMemberships } from '@/hooks/useMemberships'

export function MembershipSettings() {
  const { memberships, toggle, memberPlatforms } = useMemberships()
  const [open, setOpen] = useState(false)

  const platforms = ACTIVE_PLATFORMS.filter(p => PLATFORM_META[p].membership !== null)

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Summary row — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BadgeCheck className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-medium text-foreground">
            My subscriptions
          </span>
          {memberPlatforms.length > 0 && (
            <div className="flex gap-1">
              {memberPlatforms.map(p => (
                <span
                  key={p}
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: PLATFORM_META[p].bgColor,
                    color: PLATFORM_META[p].textColor,
                  }}
                >
                  {PLATFORM_META[p].membership?.label}
                </span>
              ))}
            </div>
          )}
          {memberPlatforms.length === 0 && (
            <span className="text-xs text-muted-foreground">None set</span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {/* Expanded toggles */}
      {open && (
        <div className="border-t border-border divide-y divide-border">
          {platforms.map(platform => {
            const meta = PLATFORM_META[platform]
            const mem = meta.membership!
            const isOn = !!memberships[platform as Platform]

            return (
              <div key={platform} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: meta.primaryColor }}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">{mem.label}</p>
                    <p className="text-xs text-muted-foreground">{mem.perk} · {mem.price}</p>
                  </div>
                </div>

                <button
                  onClick={() => toggle(platform as Platform)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                    isOn ? 'bg-primary' : 'bg-border'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      isOn ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            )
          })}
          <div className="px-4 py-2.5 bg-muted/30">
            <p className="text-xs text-muted-foreground">
              Enabling a subscription zeros out that platform&apos;s delivery fee in price comparisons.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
