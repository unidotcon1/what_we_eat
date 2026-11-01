import { apply_import, coords_from_url, match_rows, parse_takeout, type TakeoutRow } from './takeout'
import { set_spot_state } from './spots'
import type { Restaurant } from './types'

const now = '2026-11-01T10:00:00.000Z'

const place = (id: string, name: string, lat: number, lng: number): Restaurant => ({
  id,
  name,
  area: 'Bugis',
  lat,
  lng,
  priceBand: 2,
  cuisine: 'Cafe',
  tags: [],
  closed: false,
})

const row = (title: string, over: Partial<TakeoutRow> = {}): TakeoutRow => ({ title, address: '', lat: null, lng: null, url: '', note: '', ...over })

describe('parse_takeout: Saved Places JSON', () => {
  const newer = JSON.stringify({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [103.8559, 1.3] },
        properties: { date: '2024-05-01', google_maps_url: 'http://maps.google.com/?cid=1', location: { address: '1 Foo St, Singapore', country_code: 'SG', name: 'Foo Cafe' } },
      },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { location: { name: 'No Coords Place' } } },
    ],
  })

  test('reads name, address, url and coordinates (longitude comes first in GeoJSON)', () => {
    const out = parse_takeout(newer)
    expect(out.format).toBe('json')
    expect(out.errors).toEqual([])
    expect(out.rows[0]).toMatchObject({ title: 'Foo Cafe', address: '1 Foo St, Singapore', lat: 1.3, lng: 103.8559, url: 'http://maps.google.com/?cid=1' })
  })

  test('coordinates of 0,0 mean "unknown", not the middle of the ocean', () => {
    expect(parse_takeout(newer).rows[1]).toMatchObject({ title: 'No Coords Place', lat: null, lng: null })
  })

  test('also reads the older capitalised layout', () => {
    const older = JSON.stringify({
      features: [
        {
          properties: {
            Title: 'Old Style Cafe',
            'Google Maps URL': 'https://www.google.com/maps/place/Old+Style+Cafe/@1.31,103.86,17z',
            Location: { Address: '2 Bar Rd', 'Business Name': 'Old Style Cafe', 'Geo Coordinates': { Latitude: '1.31', Longitude: '103.86' } },
          },
        },
      ],
    })
    expect(parse_takeout(older).rows[0]).toMatchObject({ title: 'Old Style Cafe', address: '2 Bar Rd', lat: 1.31, lng: 103.86 })
  })

  test('a place with no title is named from its maps url when possible', () => {
    const j = JSON.stringify({ features: [{ properties: { google_maps_url: 'https://www.google.com/maps/place/Nasi+Corner%20Geylang/data=!4m2' } }] })
    expect(parse_takeout(j).rows[0].title).toBe('Nasi Corner Geylang')
  })

  test('invalid JSON and files with no places give a clear error, not a crash', () => {
    expect(parse_takeout('{ not json').errors[0]).toMatch(/not valid/i)
    expect(parse_takeout('{"features": []}').errors[0]).toMatch(/no places/i)
    expect(parse_takeout('').errors[0]).toMatch(/empty/i)
  })
})

describe('parse_takeout: list CSV', () => {
  const csv = '﻿Title,Note,URL,Tags,Comment\r\nKopi & Kin,"great, cheap",https://www.google.com/maps/place/Kopi+%26+Kin/data=!4m2!3m1!1s0x31da,,\r\n"Quote ""Corner"" Cafe",,"https://www.google.com/maps/place/x/@1.2862,103.8326,17z",,\r\n,,,,\r\n'

  test('reads quoted fields, commas inside quotes, a byte-order mark and Windows line endings', () => {
    const out = parse_takeout(csv)
    expect(out.format).toBe('csv')
    expect(out.rows).toHaveLength(2)
    expect(out.rows[0]).toMatchObject({ title: 'Kopi & Kin', note: 'great, cheap' })
    expect(out.rows[1].title).toBe('Quote "Corner" Cafe')
  })

  test('takes coordinates from the url when it has them', () => {
    const out = parse_takeout(csv)
    expect(out.rows[0].lat).toBeNull()
    expect(out.rows[1]).toMatchObject({ lat: 1.2862, lng: 103.8326 })
  })

  test('a csv without a Title or Name column is rejected with a message', () => {
    expect(parse_takeout('a,b\n1,2').errors[0]).toMatch(/title/i)
  })
})

describe('coords_from_url', () => {
  test.each([
    ['https://www.google.com/maps/place/X/data=!3d1.3521!4d103.8198', { lat: 1.3521, lng: 103.8198 }],
    ['https://www.google.com/maps/place/X/@1.3521,103.8198,17z', { lat: 1.3521, lng: 103.8198 }],
    ['https://maps.google.com/?q=1.3521,103.8198', { lat: 1.3521, lng: 103.8198 }],
    ['https://www.google.com/maps/place/X/data=!4m2!3m1!1s0x31da', null],
    ['', null],
  ])('%s', (url, expected) => {
    expect(coords_from_url(url)).toEqual(expected)
  })
})

describe('match_rows', () => {
  const catalog = [
    place('kopi-kin', 'Kopi & Kin', 1.2862, 103.8326),
    place('long-table', 'Long Table Hotpot', 1.3009, 103.8559),
    place('jumbo-a', 'Jumbo Seafood', 1.3051, 103.9307),
    place('jumbo-b', 'Jumbo Seafood', 1.2893, 103.8483),
  ]

  test('a row with coordinates matches the nearby place with a similar name', () => {
    const r = match_rows([row('Kopi and Kin Cafe', { lat: 1.28625, lng: 103.83262 })], catalog)
    expect(r.matched[0].place.id).toBe('kopi-kin')
    expect(r.matched[0].distance_m).toBeLessThan(20)
  })

  test('two branches with the same name are told apart by location', () => {
    const r = match_rows([row('Jumbo Seafood', { lat: 1.2893, lng: 103.8483 })], catalog)
    expect(r.matched[0].place.id).toBe('jumbo-b')
  })

  test('a name-only row matches when exactly one place has that name', () => {
    const r = match_rows([row('LONG TABLE HOTPOT')], catalog)
    expect(r.matched[0]).toMatchObject({ confidence: 'name_only', distance_m: null })
    expect(r.matched[0].place.id).toBe('long-table')
  })

  test('a name-only row that fits two branches is reported as ambiguous and not guessed', () => {
    const r = match_rows([row('Jumbo Seafood')], catalog)
    expect(r.matched).toHaveLength(0)
    expect(r.unmatched[0]).toMatchObject({ reason: 'ambiguous', can_add: false })
  })

  test('a located place that is not in the catalogue can be added as a new place', () => {
    const r = match_rows([row('Brand New Bistro', { lat: 1.4, lng: 103.75 })], catalog)
    expect(r.unmatched[0]).toMatchObject({ reason: 'no_nearby_place', can_add: true })
  })

  test('a name-only place that is not in the catalogue cannot be added (no location)', () => {
    const r = match_rows([row('Mystery Diner')], catalog)
    expect(r.unmatched[0]).toMatchObject({ reason: 'not_in_catalogue', can_add: false })
  })

  test('a nearby place with a completely different name is not a match', () => {
    const r = match_rows([row('Totally Different Name', { lat: 1.2862, lng: 103.8326 })], catalog)
    expect(r.matched).toHaveLength(0)
  })

  test('a row with no name at all is unmatched and not addable', () => {
    expect(match_rows([row('')], catalog).unmatched[0]).toMatchObject({ reason: 'no_name', can_add: false })
  })

  test('the summary adds up', () => {
    const r = match_rows([row('Kopi & Kin'), row('Jumbo Seafood'), row('Nowhere', { lat: 1.4, lng: 103.7 })], catalog)
    expect(r.summary).toEqual({ total: 3, matched: 1, unmatched: 2, addable: 1, ambiguous: 1 })
  })
})

describe('acceptance: a Takeout export of 100 places', () => {
  // 100 catalogue places on a grid about 330 m apart, plus two same-name branches far apart
  const catalog: Restaurant[] = []
  for (let i = 0; i < 100; i++) {
    catalog.push(place(`p${i}`, `Kopitiam ${i} Corner`, 1.25 + Math.floor(i / 10) * 0.003, 103.8 + (i % 10) * 0.003))
  }
  catalog.push(place('twin-a', 'Twin Branch', 1.35, 103.7), place('twin-b', 'Twin Branch', 1.45, 103.95))

  const rows: TakeoutRow[] = []
  // 60 exact name and exact location
  for (let i = 0; i < 60; i++) rows.push(row(`Kopitiam ${i} Corner`, { lat: catalog[i].lat, lng: catalog[i].lng }))
  // 15 messy names, location off by about 40 m
  for (let i = 60; i < 75; i++) rows.push(row(`RESTAURANT Kopitiam ${i} Corner, Singapore`, { lat: catalog[i].lat + 0.00035, lng: catalog[i].lng }))
  // 10 list-style rows: name only
  for (let i = 75; i < 85; i++) rows.push(row(`kopitiam ${i} corner`))
  // 5 name-only rows that fit two branches
  for (let i = 0; i < 5; i++) rows.push(row('Twin Branch'))
  // 10 places the catalogue does not have, with locations
  for (let i = 0; i < 10; i++) rows.push(row(`Not In Catalogue ${i}`, { lat: 1.3 + i * 0.01, lng: 103.5 + i * 0.001 }))

  const report = match_rows(rows, catalog)

  test('the file really has 100 rows', () => {
    expect(rows).toHaveLength(100)
  })

  test('the report counts are exactly as constructed', () => {
    expect(report.summary).toEqual({ total: 100, matched: 85, unmatched: 15, addable: 10, ambiguous: 5 })
  })

  test('every matched row points at the place it was built from', () => {
    const wrong = report.matched.filter((m) => m.place.id !== catalog.find((c) => c.name.toLowerCase().includes(m.row.title.toLowerCase().replace(/^restaurant |, singapore$/g, '')))?.id)
    expect(wrong).toEqual([])
  })

  test('confidence splits as expected: exact rows high, name-only rows flagged', () => {
    expect(report.matched.filter((m) => m.confidence === 'name_only')).toHaveLength(10)
    expect(report.matched.filter((m) => m.confidence === 'high')).toHaveLength(75)
  })

  test('importing it as Targeted stores 85 catalogue places and 10 new places, once each', () => {
    const out = apply_import([], report, 'targeted', now, { include_unmatched: true })
    expect(out.spots).toHaveLength(95)
    expect(out.counts).toMatchObject({ added: 95, moved: 0, unchanged: 0, kept: 0 })
    const again = apply_import(out.spots, report, 'targeted', now, { include_unmatched: true })
    expect(again.spots).toHaveLength(95)
    expect(again.counts).toMatchObject({ added: 0, unchanged: 95 })
  })
})

describe('apply_import', () => {
  const catalog = [place('kopi-kin', 'Kopi & Kin', 1.2862, 103.8326)]
  const report = match_rows([row('Kopi & Kin'), row('Brand New Bistro', { lat: 1.4, lng: 103.75, address: '9 New Rd' })], catalog)

  test('unmatched places with a location are added only when asked', () => {
    expect(apply_import([], report, 'targeted', now, { include_unmatched: false }).spots).toHaveLength(1)
    const both = apply_import([], report, 'conquered', now, { include_unmatched: true }).spots
    expect(both).toHaveLength(2)
    expect(both.find((s) => s.name === 'Brand New Bistro')).toMatchObject({ source: 'import', address: '9 New Rd', state: 'conquered', place_id: null })
  })

  test('imported catalogue places carry the import source and the catalogue name', () => {
    expect(apply_import([], report, 'targeted', now, { include_unmatched: false }).spots[0]).toMatchObject({ source: 'import', name: 'Kopi & Kin', place_id: 'kopi-kin' })
  })

  test('an import into Targeted never downgrades a place that is already Conquered', () => {
    const existing = set_spot_state([], { place_id: 'kopi-kin', name: 'Kopi & Kin', lat: 1.2862, lng: 103.8326, source: 'catalog' }, 'conquered', now).spots
    const out = apply_import(existing, report, 'targeted', now, { include_unmatched: false })
    expect(out.spots[0].state).toBe('conquered')
    expect(out.counts.kept).toBe(1)
  })

  test('an import into Conquered does move a Targeted place up', () => {
    const existing = set_spot_state([], { place_id: 'kopi-kin', name: 'Kopi & Kin', lat: 1.2862, lng: 103.8326, source: 'catalog' }, 'targeted', now).spots
    const out = apply_import(existing, report, 'conquered', '2026-11-02T10:00:00.000Z', { include_unmatched: false })
    expect(out.spots[0].state).toBe('conquered')
    expect(out.counts.moved).toBe(1)
  })
})

describe('parse_takeout: hostile or oversized files are made safe', () => {
  const json_with = (properties: Record<string, unknown>, coordinates = [103.85, 1.3]) =>
    JSON.stringify({ features: [{ geometry: { coordinates }, properties }] })

  test('a title over 120 characters is cut to 120, so the database accepts it', () => {
    const out = parse_takeout(json_with({ Title: 'x'.repeat(500) }))
    expect(out.rows[0].title).toHaveLength(120)
  })

  test('an address over 200 characters is cut to 200', () => {
    const out = parse_takeout(json_with({ Title: 'Foo', location: { address: 'y'.repeat(900) } }))
    expect(out.rows[0].address).toHaveLength(200)
  })

  test('control characters and the NUL character are removed from names, addresses and notes', () => {
    const out = parse_takeout(json_with({ Title: 'Foo\u0000\u0007 Cafe', Comment: 'tasty\u0001', location: { address: '1 A St\u0000' } }))
    expect(out.rows[0]).toMatchObject({ title: 'Foo Cafe', address: '1 A St', note: 'tasty' })
  })

  test('a lone surrogate (which Postgres rejects) is removed, a real emoji is kept', () => {
    const out = parse_takeout(json_with({ Title: 'Ramen \uD800 Bar 🍜' }))
    expect(out.rows[0].title).toBe('Ramen  Bar 🍜'.replace('  ', ' '))
  })

  test('cutting never splits an emoji in half (the database counts whole characters)', () => {
    const out = parse_takeout(json_with({ Title: 'a'.repeat(119) + '🍜🍜' }))
    expect(out.rows[0].title).toBe('a'.repeat(119) + '🍜')
  })

  test('a name made only of control characters counts as no name', () => {
    const out = parse_takeout(json_with({ Title: '\u0000\u0001' }))
    expect(out.rows[0].title).toBe('')
  })

  test('csv rows get the same treatment', () => {
    const out = parse_takeout(`Title,Note,URL\n"${'z'.repeat(300)}","a\u0000b",\n`)
    expect(out.rows[0].title).toHaveLength(120)
    expect(out.rows[0].note).toBe('ab')
  })

  test('more than 5000 rows are cut to 5000 and the person is told', () => {
    const features = Array.from({ length: 5200 }, (_, i) => ({ geometry: { coordinates: [103.85, 1.3] }, properties: { Title: `Place ${i}` } }))
    const out = parse_takeout(JSON.stringify({ features }))
    expect(out.rows).toHaveLength(5000)
    expect(out.errors).toEqual([])
    expect(out.warnings.join(' ')).toMatch(/5000/)
  })

  test('csv with more than 5000 rows is cut too', () => {
    const csv = 'Title\n' + Array.from({ length: 5100 }, (_, i) => `Place ${i}`).join('\n')
    const out = parse_takeout(csv)
    expect(out.rows).toHaveLength(5000)
    expect(out.errors).toEqual([])
    expect(out.warnings.join(' ')).toMatch(/5000/)
  })

  test('the note is limited too', () => {
    const out = parse_takeout(json_with({ Title: 'Foo', Comment: 'n'.repeat(5000) }))
    expect(out.rows[0].note.length).toBeLessThanOrEqual(500)
  })
})

describe('apply_import: only values the database accepts are stored', () => {
  test('a spot built from an unmatched row never exceeds the name and address limits', () => {
    const long_row = row('n'.repeat(400), { address: 'a'.repeat(400), lat: 1.3, lng: 103.85 })
    const report = match_rows([long_row], [])
    const { spots } = apply_import([], report, 'targeted', now, { include_unmatched: true })
    expect(spots[0].name.length).toBeLessThanOrEqual(120)
    expect(spots[0].address.length).toBeLessThanOrEqual(200)
  })

  test('rows whose cleaned name is empty are not added', () => {
    const report = match_rows([row('\u0000', { lat: 1.3, lng: 103.85 })], [])
    const { spots } = apply_import([], report, 'targeted', now, { include_unmatched: true })
    expect(spots).toHaveLength(0)
  })
})
