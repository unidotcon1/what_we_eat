import { render, waitFor } from '@testing-library/react'
import { SpotsBootstrap } from './SpotsBootstrap'
import * as auth from '../data/auth'
import * as catalog from '../data/catalog'
import * as remote from '../data/spots'
import * as supabase from '../data/supabase'
import { get_spots, reset_spots_store_for_test } from '../local/spots_store'
import type { Spot } from '../domain/spots'
import type { Restaurant } from '../domain/types'

vi.mock('../data/auth')
vi.mock('../data/catalog')
vi.mock('../data/spots')
vi.mock('../data/supabase')

const kopi: Restaurant = {
  id: 'kopi-kin',
  name: 'Kopi & Kin',
  area: 'Tiong Bahru',
  lat: 1.2862,
  lng: 103.8326,
  priceBand: 1,
  cuisine: 'Cafe',
  tags: [],
  closed: false,
}

beforeEach(() => {
  localStorage.clear()
  reset_spots_store_for_test()
  vi.mocked(auth.useUser).mockReturnValue({ user: null, ready: true })
  vi.mocked(catalog.get_catalog).mockResolvedValue([kopi])
  vi.mocked(supabase.getClient).mockReturnValue({} as never)
})

test('old heart-style saves become Targets once the catalogue has loaded', async () => {
  localStorage.setItem('wwe.saves', JSON.stringify(['kopi-kin']))
  render(<SpotsBootstrap />)
  await waitFor(() => expect(get_spots()).toHaveLength(1))
  expect(get_spots()[0]).toMatchObject({ place_id: 'kopi-kin', state: 'targeted' })
})

test('the old key is kept, and running twice does not add a second spot', async () => {
  localStorage.setItem('wwe.saves', JSON.stringify(['kopi-kin']))
  const first = render(<SpotsBootstrap />)
  await waitFor(() => expect(get_spots()).toHaveLength(1))
  first.unmount()
  render(<SpotsBootstrap />)
  await new Promise((r) => setTimeout(r, 30))
  expect(get_spots()).toHaveLength(1)
  expect(localStorage.getItem('wwe.saves')).toBe(JSON.stringify(['kopi-kin']))
})

test('signed out: the account is never contacted', async () => {
  render(<SpotsBootstrap />)
  await new Promise((r) => setTimeout(r, 30))
  expect(remote.sync_spots).not.toHaveBeenCalled()
})

test('signed in: device spots are joined with the account copy and the result is kept', async () => {
  vi.mocked(auth.useUser).mockReturnValue({ user: { id: 'u1', email: 'a@b.sg' }, ready: true })
  const from_account: Spot = {
    id: 'r:kopi-kin',
    place_id: 'kopi-kin',
    name: 'Kopi & Kin',
    address: 'Tiong Bahru',
    lat: 1.2862,
    lng: 103.8326,
    state: 'conquered',
    source: 'catalog',
    created_at: '2026-11-01T00:00:00.000Z',
    updated_at: '2026-11-01T00:00:00.000Z',
    conquered_at: '2026-11-01T00:00:00.000Z',
  }
  vi.mocked(remote.sync_spots).mockResolvedValue([from_account])
  render(<SpotsBootstrap />)
  await waitFor(() => expect(get_spots()).toEqual([from_account]))
  expect(remote.sync_spots).toHaveBeenCalledWith({}, 'u1', expect.any(Array))
})

test('an account that is not ready (the spots table is missing) leaves the device copy alone', async () => {
  vi.mocked(auth.useUser).mockReturnValue({ user: { id: 'u1', email: 'a@b.sg' }, ready: true })
  vi.mocked(remote.sync_spots).mockRejectedValue(new Error('relation "spots" does not exist'))
  localStorage.setItem('wwe.saves', JSON.stringify(['kopi-kin']))
  render(<SpotsBootstrap />)
  await waitFor(() => expect(get_spots()).toHaveLength(1))
  await new Promise((r) => setTimeout(r, 30))
  expect(get_spots()).toHaveLength(1)
})
