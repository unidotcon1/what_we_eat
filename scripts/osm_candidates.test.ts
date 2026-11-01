import {
  convert_opening_hours,
  dedupe_candidates,
  map_cuisine,
  nearest_area,
  to_candidate,
  to_csv,
  type Candidate,
  type OsmElement,
} from './osm_candidates'
import { parseCsv, parseHours, parseRestaurantRow } from './seed'

describe('map_cuisine', () => {
  test.each([
    ['chinese', 'Chinese'],
    ['seafood;chinese', 'Chinese'],
    ['Thai_Cuisine', 'Thai'],
    ['japanese;sushi', 'Japanese'],
    ['sushi', 'Japanese'],
    ['italian', 'Western'],
    ['burger', 'Western'],
    ['Indian', 'Indian'],
    ['korean', 'Korean'],
    ['indonesian', 'Malay'],
    ['coffee_shop', 'Cafe'],
    ['bubble_tea', 'Cafe'],
    ['ice_cream', 'Dessert'],
  ])('%s maps to %s', (raw, expected) => {
    expect(map_cuisine(raw)).toBe(expected)
  })

  test('unmapped, blank and messy values give an empty string', () => {
    expect(map_cuisine('regional')).toBe('')
    expect(map_cuisine('')).toBe('')
    expect(map_cuisine('  ;; ')).toBe('')
  })
})

describe('convert_opening_hours', () => {
  test.each([
    ['Mo-Su 10:00-22:00', 'daily 10:00-22:00'],
    ['Mo-Fr 11:00-14:00,17:00-22:00', 'mon-fri 11:00-14:00;mon-fri 17:00-22:00'],
    ['Mo-Fr 09:00-18:00; Sa 09:00-13:00; Su off', 'mon-fri 09:00-18:00;sat 09:00-13:00'],
    ['Mo,We,Fr 10:00-20:00', 'mon 10:00-20:00;wed 10:00-20:00;fri 10:00-20:00'],
    ['Mo,Tu,We 10:00-20:00', 'mon-wed 10:00-20:00'],
    ['24/7', 'daily 00:00-24:00'],
    ['Mo-Su 10:00-22:00; PH off', 'daily 10:00-22:00'],
    ['Mo-Su 17:00-02:00', 'daily 17:00-02:00'],
    ['Mo-Su 9:00-18:00', 'daily 9:00-18:00'],
  ])('%s becomes %s', (osm, expected) => {
    expect(convert_opening_hours(osm)).toBe(expected)
  })

  test('hours the tool cannot express safely are left blank for the owner', () => {
    for (const osm of ['', 'sunrise-sunset', 'Mo-Su 10:00-22:00 "by appointment"', 'Fr-Mo 10:00-20:00', 'week 1-4 Mo 10:00-12:00', 'by appointment']) {
      expect(convert_opening_hours(osm)).toBe('')
    }
  })

  test('every converted value is accepted by the seed hours parser', () => {
    for (const osm of ['Mo-Su 10:00-22:00', 'Mo-Fr 11:00-14:00,17:00-22:00', 'Mo,We,Fr 10:00-20:00', '24/7', 'Mo-Su 17:00-02:00']) {
      expect(() => parseHours(convert_opening_hours(osm))).not.toThrow()
    }
  })
})

describe('nearest_area', () => {
  test('a point in Orchard is named Orchard', () => {
    expect(nearest_area(1.3048, 103.8318)).toBe('Orchard')
  })
  test('a point far from every known area is left blank', () => {
    expect(nearest_area(1.2, 104.5)).toBe('')
  })
})

const node = (tags: Record<string, string>, over: Partial<OsmElement> = {}): OsmElement => ({
  type: 'node',
  id: 1,
  lat: 1.3048,
  lon: 103.8318,
  tags: { amenity: 'restaurant', name: 'Suki-ya', ...tags },
  ...over,
})

describe('to_candidate', () => {
  test('a normal restaurant becomes a candidate with provenance and a blank price', () => {
    const c = to_candidate(node({ cuisine: 'japanese', 'diet:halal': 'yes' })) as Candidate
    expect(c).toMatchObject({
      name: 'Suki-ya',
      area: 'Orchard',
      lat: '1.30480',
      lng: '103.83180',
      price_band: '',
      cuisine: 'Japanese',
      tags: 'halal',
      closed: '',
      osm_id: 'node/1',
      osm_cuisine: 'japanese',
      source: 'OpenStreetMap contributors (ODbL)',
    })
  })

  test('a way uses its center point', () => {
    const c = to_candidate({ type: 'way', id: 9, center: { lat: 1.3, lon: 103.85 }, tags: { amenity: 'cafe', name: 'Kopi' } }) as Candidate
    expect(c.lat).toBe('1.30000')
    expect(c.osm_id).toBe('way/9')
  })

  test('a cafe without a usable cuisine tag is a Cafe', () => {
    expect((to_candidate(node({ amenity: 'cafe', name: 'Brew' })) as Candidate).cuisine).toBe('Cafe')
  })

  test('vegetarian and halal tags are both carried over', () => {
    const c = to_candidate(node({ 'diet:halal': 'only', 'diet:vegetarian': 'yes' })) as Candidate
    expect(c.tags).toBe('halal|vegetarian')
  })

  test('opening hours are converted when they are simple', () => {
    expect((to_candidate(node({ opening_hours: 'Mo-Su 10:00-22:00' })) as Candidate).hours).toBe('daily 10:00-22:00')
  })

  test.each([
    [{ name: '' }, 'no name'],
    [{ name: 'People’s Park Food Centre Blk 32' }, 'looks like a food centre'],
    [{ name: 'Maxwell Hawker Centre' }, 'looks like a food centre'],
  ])('%j is skipped as "%s"', (tags, reason) => {
    expect(to_candidate(node(tags))).toEqual({ skip: reason })
  })

  test('a place with no coordinates, or outside Singapore, is skipped', () => {
    expect(to_candidate({ type: 'node', id: 2, tags: { name: 'X', amenity: 'cafe' } })).toEqual({ skip: 'no coordinates' })
    expect(to_candidate(node({}, { lat: 3.1, lon: 101.7 }))).toEqual({ skip: 'outside Singapore' })
  })

  test('commas, quotes and line breaks in a name cannot break the CSV', () => {
    const c = to_candidate(node({ name: 'Foo, "Bar"\nGrill' })) as Candidate
    expect(c.name).toBe('Foo Bar Grill')
  })
})

describe('dedupe_candidates', () => {
  const make = (name: string, lat: string, lng: string): Candidate => ({ ...(to_candidate(node({ name })) as Candidate), name, lat, lng })

  test('the same name within about 30 metres counts once', () => {
    const out = dedupe_candidates([make('Jumbo', '1.30000', '103.85000'), make('JUMBO', '1.30010', '103.85010')])
    expect(out).toHaveLength(1)
  })

  test('the same name at two different branches is kept twice', () => {
    expect(dedupe_candidates([make('Jumbo', '1.30000', '103.85000'), make('Jumbo', '1.28000', '103.90000')])).toHaveLength(2)
  })
})

describe('to_csv', () => {
  test('the header starts with the seed columns and ends with provenance', () => {
    const header = to_csv([]).split('\n')[0]
    expect(header).toBe('name,area,lat,lng,price_band,cuisine,tags,hours,closed,osm_id,osm_cuisine,source')
  })

  test('a candidate round-trips through the seed parser once the owner fills in a price', () => {
    const c = to_candidate(node({ cuisine: 'japanese', opening_hours: 'Mo-Su 10:00-22:00' })) as Candidate
    const row = parseCsv(to_csv([c]))[0]
    expect(parseRestaurantRow(row)).toEqual({ skip: 'missing price_band' })
    expect(parseRestaurantRow({ ...row, price_band: '2' })).toMatchObject({ name: 'Suki-ya', priceBand: 2, cuisine: 'Japanese', area: 'Orchard' })
  })
})
