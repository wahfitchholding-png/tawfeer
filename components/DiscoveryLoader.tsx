'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface Props {
  lat: number
  lng: number
  nearbyCount: number
}

export function DiscoveryLoader({ lat, lng, nearbyCount: initial }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'starting' | 'running' | 'done'>('idle')
  const [count, setCount] = useState(initial)

  const poll = useCallback(async () => {
    const res = await fetch(`/api/discover?lat=${lat}&lng=${lng}`)
    const data = await res.json() as { status: string; nearbyCount: number }
    setCount(data.nearbyCount)

    if (data.status === 'running') {
      setTimeout(poll, 3000)
    } else {
      setStatus('done')
      router.refresh()
    }
  }, [lat, lng, router])

  useEffect(() => {
    if (initial > 0) return // Already have data

    async function start() {
      setStatus('starting')
      await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      })
      setStatus('running')
      setTimeout(poll, 4000)
    }

    start().catch(console.error)
  }, [lat, lng, initial, poll])

  if (status === 'idle' || status === 'done' || initial > 0) return null

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-primary/5 px-4 py-3 mb-4">
      <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          {status === 'starting' ? 'Connecting to delivery apps…' : `Scanning Talabat, Deliveroo, Careem, Keeta & Noon Food…`}
        </p>
        {count > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">{count} restaurants found so far</p>
        )}
      </div>
    </div>
  )
}
