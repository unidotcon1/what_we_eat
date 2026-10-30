import { applyFilters, distanceKm, sortRestaurants } from './filters'
import type { Filters, Restaurant } from './types'

const bugis = { lat: 1.3, lng: 103.8559 }

const day = (ranges: [string, string][]) => ranges
const noHours = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] }

function r(over: Partial<Restaurant>): Restaurant {
  return {
    id: 'x',
    name: 'Place',
    area: 'Bugis',
    lat: 1.301,
    lng: 103.856,
    priceBand: 2,
    cuisine: 'Chinese',
    tags: [],
    closed: false,
    ...over,
  }
}

const base: Filters = {
  query: '',
  bands: [],
  audience: [],
  cuisines: [],
  dietary: [],
  openNow: false,
}

const friNight = new Date('2026-10-30T20:00:00+08:00')

test('bands [2,3] returns both bands and nothing else', () => {
  const list = [r({ id: 'a', priceBand: 1 }), r({ id: 'b', priceBand: 2 }), r({ id: 'c', priceBand: 3 }), r({ id: 'd', priceBand: 4 })]
  const ids = applyFilters(list, { ...base, bands: [2, 3] }, friNight).map((x) => x.id)
  expect(ids).toEqual(['b', 'c'])
})

test('maxKm 2 excludes a restaurant about 3 km from the origin', () => {
  const near = r({ id: 'near' })
  const far = r({ id: 'far', lat: 1.286, lng: 103.832 })
  expect(distanceKm(bugis, far)).toBeGreaterThan(2.5)
  const ids = applyFilters([near, far], { ...base, origin: bugis, maxKm: 2 }, friNight).map((x) => x.id)
  expect(ids).toEqual(['near'])
})

test('a whitespace-only query returns the whole list', () => {
  const list = [r({ id: 'a' }), r({ id: 'b' })]
  expect(applyFilters(list, { ...base, query: '   ' }, friNight)).toHaveLength(2)
})

test('query matches name, area or cuisine case-insensitively', () => {
  const list = [r({ id: 'a', name: 'Long Table Hotpot' }), r({ id: 'b', name: 'Other', cuisine: 'Japanese' })]
  expect(applyFilters(list, { ...base, query: 'hotpot' }, friNight).map((x) => x.id)).toEqual(['a'])
  expect(applyFilters(list, { ...base, query: 'JAPAN' }, friNight).map((x) => x.id)).toEqual(['b'])
})

test('permanently closed restaurants are never returned', () => {
  expect(applyFilters([r({ closed: true })], base, friNight)).toEqual([])
})

test('openNow excludes a restaurant without hours and includes one open Fri 20:00 SGT', () => {
  const unknown = r({ id: 'unknown' })
  const open = r({ id: 'open', hours: { ...noHours, fri: day([['11:00', '22:00']]) } })
  const shut = r({ id: 'shut', hours: { ...noHours, fri: day([['11:00', '15:00']]) } })
  const ids = applyFilters([unknown, open, shut], { ...base, openNow: true }, friNight).map((x) => x.id)
  expect(ids).toEqual(['open'])
})

test('openNow counts the early hours after a period that runs past midnight', () => {
  const lateNight = r({ id: 'late', hours: { ...noHours, fri: day([['17:00', '02:00']]) } })
  const satOneAm = new Date('2026-10-31T01:00:00+08:00')
  expect(applyFilters([lateNight], { ...base, openNow: true }, satOneAm)).toHaveLength(1)
  const satThreeAm = new Date('2026-10-31T03:00:00+08:00')
  expect(applyFilters([lateNight], { ...base, openNow: true }, satThreeAm)).toHaveLength(0)
})

test('audience group matches the "group" tag', () => {
  const list = [r({ id: 'g', tags: ['group'] }), r({ id: 'd', tags: ['date'] })]
  expect(applyFilters(list, { ...base, audience: ['group'] }, friNight).map((x) => x.id)).toEqual(['g'])
})

test('cuisine and dietary filters narrow the list', () => {
  const list = [
    r({ id: 'a', cuisine: 'Japanese', tags: ['halal'] }),
    r({ id: 'b', cuisine: 'Japanese' }),
    r({ id: 'c', cuisine: 'Western', tags: ['halal'] }),
  ]
  const out = applyFilters(list, { ...base, cuisines: ['Japanese'], dietary: ['halal'] }, friNight)
  expect(out.map((x) => x.id)).toEqual(['a'])
})

test('no match returns an empty list', () => {
  expect(applyFilters([r({})], { ...base, query: 'zzz' }, friNight)).toEqual([])
})

test('sortRestaurants nearest orders by distance and price orders by band', () => {
  const near = r({ id: 'near', priceBand: 4 })
  const far = r({ id: 'far', lat: 1.286, lng: 103.832, priceBand: 1 })
  expect(sortRestaurants([far, near], 'nearest', bugis).map((x) => x.id)).toEqual(['near', 'far'])
  expect(sortRestaurants([near, far], 'price').map((x) => x.id)).toEqual(['far', 'near'])
})
