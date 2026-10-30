import { parseRestaurantRow, parseHours } from './seed'

const row = {
  name: 'Long Table Hotpot',
  area: 'Bugis',
  lat: '1.3009',
  lng: '103.8559',
  price_band: '2',
  cuisine: 'Chinese',
  tags: 'group|late',
  hours: 'daily 17:00-02:00',
  closed: '',
}

test('a row with a blank price_band is skipped with a reason', () => {
  expect(parseRestaurantRow({ ...row, price_band: '' })).toEqual({ skip: 'missing price_band' })
})

test('an unknown cuisine is skipped with a reason', () => {
  expect(parseRestaurantRow({ ...row, cuisine: 'Martian' })).toEqual({ skip: 'unknown cuisine "Martian"' })
})

test('a price_band outside 1-4 is skipped', () => {
  expect(parseRestaurantRow({ ...row, price_band: '7' })).toEqual({ skip: 'missing price_band' })
})

test('a valid row becomes a Restaurant with priceBand 2 and split tags', () => {
  const out = parseRestaurantRow(row)
  expect(out).toMatchObject({
    id: 'long-table-hotpot',
    name: 'Long Table Hotpot',
    area: 'Bugis',
    priceBand: 2,
    cuisine: 'Chinese',
    tags: ['group', 'late'],
    closed: false,
  })
  expect((out as { lat: number }).lat).toBeCloseTo(1.3009)
})

test('closed column "yes" marks the restaurant permanently closed', () => {
  expect(parseRestaurantRow({ ...row, closed: 'yes' })).toMatchObject({ closed: true })
})

test('a row with no name or bad coordinates is skipped', () => {
  expect(parseRestaurantRow({ ...row, name: '' })).toEqual({ skip: 'missing name' })
  expect(parseRestaurantRow({ ...row, lat: 'abc' })).toEqual({ skip: 'bad coordinates' })
})

test('parseHours expands day ranges and daily', () => {
  const h = parseHours('mon-thu 11:00-22:00;fri-sat 11:00-02:00')!
  expect(h.mon).toEqual([['11:00', '22:00']])
  expect(h.thu).toEqual([['11:00', '22:00']])
  expect(h.fri).toEqual([['11:00', '02:00']])
  expect(h.sun).toEqual([])
  expect(parseHours('daily 10:00-20:00')!.sun).toEqual([['10:00', '20:00']])
})

test('blank hours means unknown (undefined), not closed', () => {
  expect(parseHours('')).toBeUndefined()
})
