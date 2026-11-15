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

test('carries an image, a menu link and a menu when the database has them, and ignores unsafe ones', async () => {
  const good = { ...dbRow, image_url: '/restaurants/kopi-kin.webp', menu_url: 'https://kopikin.example/menu', menu: [{ section: 'Drinks', items: [{ name: 'Kopi', price: '$2' }] }] }
  const bad = { ...dbRow, id: 'bad', image_url: 'https://evil.example/x.jpg', menu_url: 'javascript:alert(1)', menu: 'nope' }
  const out = await fetchRestaurants(source({ data: [good, bad], error: null }))
  expect(out[0]).toMatchObject({ image: '/restaurants/kopi-kin.webp', menu_url: 'https://kopikin.example/menu', menu: [{ section: 'Drinks', items: [{ name: 'Kopi', price: '$2' }] }] })
  expect(out[1].image).toBeUndefined()
  expect(out[1].menu_url).toBeUndefined()
  expect(out[1].menu).toBeUndefined()
})

test('rows from a database without the media columns still load', async () => {
  const out = await fetchRestaurants(source({ data: [dbRow], error: null }))
  expect(out[0].image).toBeUndefined()
  expect(out[0].menu).toBeUndefined()
})
