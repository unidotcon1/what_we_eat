import { google_maps_directions, parse_travel_mode } from './directions'

const place = { lat: 1.3009, lng: 103.8559 }

function params(url: string | null) {
  if (!url) throw new Error('expected a link')
  return new URL(url).searchParams
}

test('opens Google Maps directions to the exact coordinates, with no origin so it uses where the person is', () => {
  const url = google_maps_directions(place, 'transit')
  expect(url?.startsWith('https://www.google.com/maps/dir/?')).toBe(true)
  const p = params(url)
  expect(p.get('api')).toBe('1')
  expect(p.get('destination')).toBe('1.3009,103.8559')
  expect(p.has('origin')).toBe(false)
})

test('the travel mode is set explicitly, so Maps does not guess from the last trip', () => {
  expect(params(google_maps_directions(place, 'walking')).get('travelmode')).toBe('walking')
  expect(params(google_maps_directions(place, 'transit')).get('travelmode')).toBe('transit')
  expect(params(google_maps_directions(place, 'driving')).get('travelmode')).toBe('driving')
})

test('walking and driving start guidance straight away; transit shows the choice of routes instead', () => {
  expect(params(google_maps_directions(place, 'walking')).get('dir_action')).toBe('navigate')
  expect(params(google_maps_directions(place, 'driving')).get('dir_action')).toBe('navigate')
  expect(params(google_maps_directions(place, 'transit')).has('dir_action')).toBe(false)
})

test('coordinates keep six decimals at most and negatives survive', () => {
  expect(params(google_maps_directions({ lat: -1.23456789, lng: 103.5 }, 'walking')).get('destination')).toBe('-1.234568,103.5')
})

test('a place without usable coordinates gives no link rather than a wrong one', () => {
  expect(google_maps_directions({ lat: NaN, lng: 103.8 }, 'walking')).toBeNull()
  expect(google_maps_directions({ lat: 1.3, lng: Infinity }, 'walking')).toBeNull()
  expect(google_maps_directions({ lat: 91, lng: 103.8 }, 'walking')).toBeNull()
  expect(google_maps_directions({ lat: 1.3, lng: 181 }, 'walking')).toBeNull()
})

describe('parse_travel_mode', () => {
  test('accepts the three modes and falls back to transit for anything else', () => {
    expect(parse_travel_mode('walking')).toBe('walking')
    expect(parse_travel_mode('driving')).toBe('driving')
    expect(parse_travel_mode('transit')).toBe('transit')
    expect(parse_travel_mode('flying')).toBe('transit')
    expect(parse_travel_mode(null)).toBe('transit')
    expect(parse_travel_mode(undefined)).toBe('transit')
  })
})
