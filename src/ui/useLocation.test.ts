import { act, renderHook } from '@testing-library/react'
import { useLocation } from './useLocation'

type Geo = { getCurrentPosition: (ok: (p: unknown) => void, fail: (e: unknown) => void) => void }

function stubGeolocation(geo: Geo | undefined) {
  Object.defineProperty(navigator, 'geolocation', { value: geo, configurable: true })
}

afterEach(() => stubGeolocation(undefined))

test('starts idle with no coordinates', () => {
  stubGeolocation({ getCurrentPosition: vi.fn() })
  const { result } = renderHook(() => useLocation())
  expect(result.current.status).toBe('idle')
  expect(result.current.coords).toBeUndefined()
})

test('request stores the coordinates when permission is granted', () => {
  stubGeolocation({ getCurrentPosition: (ok) => ok({ coords: { latitude: 1.3, longitude: 103.85 } }) })
  const { result } = renderHook(() => useLocation())
  act(() => result.current.request())
  expect(result.current.status).toBe('granted')
  expect(result.current.coords).toEqual({ lat: 1.3, lng: 103.85 })
})

test('a refused permission sets the status to denied', () => {
  stubGeolocation({ getCurrentPosition: (_ok, fail) => fail({ code: 1 }) })
  const { result } = renderHook(() => useLocation())
  act(() => result.current.request())
  expect(result.current.status).toBe('denied')
  expect(result.current.coords).toBeUndefined()
})

test('a browser without geolocation counts as denied', () => {
  stubGeolocation(undefined)
  const { result } = renderHook(() => useLocation())
  act(() => result.current.request())
  expect(result.current.status).toBe('denied')
})
