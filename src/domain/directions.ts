export type TravelMode = 'walking' | 'transit' | 'driving'

const MODES: TravelMode[] = ['walking', 'transit', 'driving']

/** Public transport is the most useful default in Singapore. */
export function parse_travel_mode(value: unknown): TravelMode {
  return MODES.find((m) => m === value) ?? 'transit'
}

const six = (n: number) => String(Math.round(n * 1e6) / 1e6)

/**
 * A Google Maps directions link to the exact coordinates. There is no origin, so Maps starts from where the person is.
 * Walking and driving start guidance at once (dir_action=navigate); transit lets the person choose a route first.
 * Returns null when the place has no usable coordinates, so we never send someone to the wrong spot.
 */
export function google_maps_directions(place: { lat: number; lng: number }, mode: TravelMode): string | null {
  const { lat, lng } = place
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  const params = new URLSearchParams({ api: '1', destination: `${six(lat)},${six(lng)}`, travelmode: mode })
  if (mode !== 'transit') params.set('dir_action', 'navigate')
  return `https://www.google.com/maps/dir/?${params.toString()}`
}
