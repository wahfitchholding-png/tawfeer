'use client'

import { useState, useCallback } from 'react'
import type { Location } from '@/types'

type LocationState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'granted'; location: Location; area?: string }
  | { status: 'denied'; error: string }

export function useLocation() {
  const [state, setState] = useState<LocationState>({ status: 'idle' })

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState({ status: 'denied', error: 'Geolocation is not supported by your browser.' })
      return
    }

    setState({ status: 'loading' })

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location: Location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }

        // Reverse geocode to get area name
        let area: string | undefined
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${location.lat}&lon=${location.lng}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          )
          const data = await res.json()
          area =
            data.address?.suburb ??
            data.address?.neighbourhood ??
            data.address?.district ??
            data.address?.city ??
            'Dubai'
        } catch {
          area = 'Dubai'
        }

        setState({ status: 'granted', location, area })
      },
      (error) => {
        const messages: Record<number, string> = {
          1: 'Location access was denied. Please enable location in your browser settings.',
          2: 'Unable to determine your location. Please try again.',
          3: 'Location request timed out. Please try again.',
        }
        setState({ status: 'denied', error: messages[error.code] ?? 'Location error.' })
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }, [])

  return { state, requestLocation }
}
