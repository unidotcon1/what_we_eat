import { fetchRestaurants, type RestaurantSource } from './restaurants'

const dbRow = {
  id: 'kopi-kin',
  name: 'Kopi & Kin',
  area: 'Tiong Bahru',
  lat: 1.2862,
  lng: 103.8326,
  price_band: 1,
  cuisine: 'Cafe',
  tags: ['small', 'halal'],
  hours: null,
  closed: false,
}

function source(result: { data: unknown; error: { message: string } | null }): RestaurantSource {
  return { from: () => ({ select: async () => result }) } as unknown as RestaurantSource
}

test('maps database rows to Restaurant objects', async () => {
  const out = await fetchRestaurants(source({ data: [dbRow], error: null }))
  expect(out).toEqual([
    {
      id: 'kopi-kin',
      name: 'Kopi & Kin',
      area: 'Tiong Bahru',
      lat: 1.2862,
      lng: 103.8326,
      priceBand: 1,
      cuisine: 'Cafe',
      tags: ['small', 'halal'],
      hours: undefined,
      closed: false,
    },
  ])
})

test('rejects with a readable message when the database errors', async () => {
  await expect(fetchRestaurants(source({ data: null, error: { message: 'boom' } }))).rejects.toThrow(
    'Could not load restaurants: boom',
  )
})

test('falls back to the bundled sample restaurants when there is no database', async () => {
  const out = await fetchRestaurants(null)
  expect(out.length).toBeGreaterThanOrEqual(20)
  expect(out[0]).toHaveProperty('priceBand')
})
