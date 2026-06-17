'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { MapPin, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocation } from '@/hooks/useLocation'

export function LocationDetector() {
  const { state, requestLocation } = useLocation()
  const router = useRouter()

  useEffect(() => {
    if (state.status === 'granted') {
      const { lat, lng } = state.location
      router.push(`/restaurants?lat=${lat}&lng=${lng}&area=${encodeURIComponent(state.area ?? 'Dubai')}`)
    }
  }, [state, router])

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
        <MapPin className="w-10 h-10 text-primary" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Find the cheapest delivery</h1>
        <p className="text-muted-foreground max-w-xs mx-auto">
          We compare Talabat, Deliveroo, Careem, and Keeta — so you always pay less.
        </p>
      </div>

      {state.status === 'idle' && (
        <Button size="lg" onClick={requestLocation} className="w-full max-w-xs">
          <MapPin className="w-5 h-5" />
          Use my location
        </Button>
      )}

      {state.status === 'loading' && (
        <Button size="lg" disabled className="w-full max-w-xs">
          <Loader2 className="w-5 h-5 animate-spin" />
          Detecting location...
        </Button>
      )}

      {state.status === 'granted' && (
        <Button size="lg" disabled className="w-full max-w-xs">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading restaurants...
        </Button>
      )}

      {state.status === 'denied' && (
        <div className="space-y-4 w-full max-w-xs">
          <div className="flex items-start gap-3 rounded-xl bg-destructive/10 p-4 text-left">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{state.error}</p>
          </div>
          <Button size="lg" variant="outline" onClick={requestLocation} className="w-full">
            Try again
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Currently covering Dubai Marina, JBR &amp; surrounding areas
      </p>
    </div>
  )
}
