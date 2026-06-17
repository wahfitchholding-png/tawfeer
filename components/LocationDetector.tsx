'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { MapPin, Loader2, AlertCircle, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLocation } from '@/hooks/useLocation'

const QUICK_AREAS = [
  { label: 'Dubai Marina', lat: 25.0805, lng: 55.1403 },
  { label: 'Downtown Dubai', lat: 25.1972, lng: 55.2744 },
  { label: 'DIFC', lat: 25.2120, lng: 55.2822 },
  { label: 'JLT', lat: 25.0730, lng: 55.1510 },
  { label: 'Business Bay', lat: 25.1888, lng: 55.2606 },
  { label: 'Jumeirah', lat: 25.2080, lng: 55.2530 },
  { label: 'Deira', lat: 25.2697, lng: 55.3094 },
  { label: 'Bur Dubai', lat: 25.2520, lng: 55.2990 },
]

export function LocationDetector() {
  const { state, requestLocation } = useLocation()
  const router = useRouter()
  const [address, setAddress] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (state.status === 'granted') {
      const { lat, lng } = state.location
      router.push(`/restaurants?lat=${lat}&lng=${lng}&area=${encodeURIComponent(state.area ?? 'Dubai')}`)
    }
  }, [state, router])

  const handleAddressSearch = async (query: string) => {
    if (!query.trim()) return
    setSearching(true)
    setSearchError('')
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', Dubai')}&format=json&limit=1&countrycodes=ae`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const results = await res.json()
      if (!results.length) {
        setSearchError('Address not found. Try a neighbourhood or landmark.')
        setSearching(false)
        return
      }
      const { lat, lon, display_name } = results[0]
      const area = display_name.split(',')[0]
      router.push(`/restaurants?lat=${lat}&lng=${lon}&area=${encodeURIComponent(area)}`)
    } catch {
      setSearchError('Could not search. Check your connection.')
      setSearching(false)
    }
  }

  const handleQuickArea = (area: { label: string; lat: number; lng: number }) => {
    router.push(`/restaurants?lat=${area.lat}&lng=${area.lng}&area=${encodeURIComponent(area.label)}`)
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center w-full max-w-xs">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
        <MapPin className="w-10 h-10 text-primary" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Find the cheapest delivery</h1>
        <p className="text-muted-foreground text-sm">
          Compare Talabat, Deliveroo, Careem, Keeta &amp; Noon Food — so you always pay less.
        </p>
      </div>

      {/* Address search */}
      <div className="w-full space-y-2">
        <form
          onSubmit={e => { e.preventDefault(); handleAddressSearch(address) }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Enter your area or address"
              className="pl-9"
              disabled={searching}
            />
          </div>
          <Button type="submit" disabled={searching || !address.trim()}>
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Go'}
          </Button>
        </form>

        {searchError && (
          <div className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-left">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-xs text-destructive">{searchError}</p>
          </div>
        )}

        {/* Quick area chips */}
        <div className="flex flex-wrap gap-1.5 justify-center">
          {QUICK_AREAS.map(area => (
            <button
              key={area.label}
              onClick={() => handleQuickArea(area)}
              className="text-xs px-2.5 py-1 rounded-full border border-border bg-secondary text-secondary-foreground hover:bg-muted transition-colors"
            >
              {area.label}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* GPS button */}
      {state.status === 'idle' && (
        <Button size="lg" variant="outline" onClick={requestLocation} className="w-full">
          <MapPin className="w-5 h-5" />
          Use my location
        </Button>
      )}

      {state.status === 'loading' && (
        <Button size="lg" variant="outline" disabled className="w-full">
          <Loader2 className="w-5 h-5 animate-spin" />
          Detecting location...
        </Button>
      )}

      {state.status === 'granted' && (
        <Button size="lg" variant="outline" disabled className="w-full">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading restaurants...
        </Button>
      )}

      {state.status === 'denied' && (
        <div className="space-y-3 w-full">
          <div className="flex items-start gap-3 rounded-xl bg-destructive/10 p-4 text-left">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{state.error}</p>
          </div>
          <Button size="lg" variant="outline" onClick={requestLocation} className="w-full">
            Try again
          </Button>
        </div>
      )}
    </div>
  )
}
