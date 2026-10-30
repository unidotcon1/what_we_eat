import { useCallback, useState } from 'react'
import type { LatLng } from '../domain/types'

export type LocationState = {
  status: 'idle' | 'granted' | 'denied'
  coords: LatLng | undefined
  request(): void
}

export function useLocation(): LocationState {
  const [status, setStatus] = useState<'idle' | 'granted' | 'denied'>('idle')
  const [coords, setCoords] = useState<LatLng | undefined>()

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('denied')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCoords({ lat: p.coords.latitude, lng: p.coords.longitude })
        setStatus('granted')
      },
      () => setStatus('denied'),
      { timeout: 10000 },
    )
  }, [])

  return { status, coords, request }
}
