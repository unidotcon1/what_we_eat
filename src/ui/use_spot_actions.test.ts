import { act, renderHook } from '@testing-library/react'
import { use_spot_actions } from './use_spot_actions'
import * as auth from '../data/auth'
import * as remote from '../data/spots'
import * as supabase from '../data/supabase'
import { reset_spots_store_for_test } from '../local/spots_store'
import type { Restaurant } from '../domain/types'

vi.mock('../data/auth')
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
  vi.mocked(supabase.getClient).mockReturnValue({} as never)
  vi.mocked(remote.push_changes).mockResolvedValue(undefined)
  vi.mocked(remote.claim_points_for_new).mockResolvedValue(undefined)
})

test('a place nobody has touched has no state', () => {
  const { result } = renderHook(() => use_spot_actions())
  expect(result.current.state_of('kopi-kin')).toBeUndefined()
})

test('toggle_target adds a Target and a second press removes it', () => {
  const { result } = renderHook(() => use_spot_actions())
  act(() => result.current.toggle_target(kopi))
  expect(result.current.state_of('kopi-kin')).toBe('targeted')
  expect(result.current.spots).toHaveLength(1)
  act(() => result.current.toggle_target(kopi))
  expect(result.current.state_of('kopi-kin')).toBeUndefined()
})

test('conquer moves a Target to Conquered and stamps the time', () => {
  const { result } = renderHook(() => use_spot_actions())
  act(() => result.current.toggle_target(kopi))
  act(() => result.current.conquer(kopi))
  expect(result.current.state_of('kopi-kin')).toBe('conquered')
  expect(result.current.spots).toHaveLength(1)
  expect(result.current.spots[0].conquered_at).not.toBeNull()
})

test('conquer works on a place that was never a Target', () => {
  const { result } = renderHook(() => use_spot_actions())
  act(() => result.current.conquer(kopi))
  expect(result.current.state_of('kopi-kin')).toBe('conquered')
})

test('pressing Target on a Conquered Spot moves it back to Target instead of deleting it', () => {
  const { result } = renderHook(() => use_spot_actions())
  act(() => result.current.conquer(kopi))
  act(() => result.current.toggle_target(kopi))
  expect(result.current.state_of('kopi-kin')).toBe('targeted')
  expect(result.current.spots[0].conquered_at).toBeNull()
})

test('remove deletes a spot by id', () => {
  const { result } = renderHook(() => use_spot_actions())
  act(() => result.current.toggle_target(kopi))
  act(() => result.current.remove(result.current.spots[0].id))
  expect(result.current.spots).toHaveLength(0)
})

test('move changes the state of an existing spot', () => {
  const { result } = renderHook(() => use_spot_actions())
  act(() => result.current.toggle_target(kopi))
  act(() => result.current.move(result.current.spots[0].id, 'conquered'))
  expect(result.current.state_of('kopi-kin')).toBe('conquered')
})

test('signed out: nothing is sent to the account', () => {
  const { result } = renderHook(() => use_spot_actions())
  act(() => result.current.toggle_target(kopi))
  expect(remote.push_changes).not.toHaveBeenCalled()
})

test('signed in: each change is written to the account and a new catalogue spot asks for its points', () => {
  vi.mocked(auth.useUser).mockReturnValue({ user: { id: 'u1', email: 'a@b.sg' }, ready: true })
  const { result } = renderHook(() => use_spot_actions())
  act(() => result.current.toggle_target(kopi))
  expect(remote.push_changes).toHaveBeenCalledTimes(1)
  const diff = vi.mocked(remote.push_changes).mock.calls[0][2]
  expect(diff.upserts.map((s) => s.place_id)).toEqual(['kopi-kin'])
  expect(remote.claim_points_for_new).toHaveBeenCalledTimes(1)
})

test('a failed write to the account does not break the device copy', async () => {
  vi.mocked(auth.useUser).mockReturnValue({ user: { id: 'u1', email: 'a@b.sg' }, ready: true })
  vi.mocked(remote.push_changes).mockRejectedValue(new Error('offline'))
  const { result } = renderHook(() => use_spot_actions())
  await act(async () => result.current.toggle_target(kopi))
  expect(result.current.state_of('kopi-kin')).toBe('targeted')
})

test('commit_spots saves a whole new list at once and writes it to the account when signed in', () => {
  vi.mocked(auth.useUser).mockReturnValue({ user: { id: 'u1', email: 'a@b.sg' }, ready: true })
  const { result } = renderHook(() => use_spot_actions())
  act(() => result.current.toggle_target(kopi))
  const before = result.current.spots
  vi.mocked(remote.push_changes).mockClear()
  const extra = { ...before[0], id: 'm:extra', place_id: null, name: 'Extra' }
  act(() => result.current.commit_spots([...before, extra]))
  expect(result.current.spots).toHaveLength(2)
  expect(vi.mocked(remote.push_changes).mock.calls[0][2].upserts.map((s) => s.id)).toEqual(['m:extra'])
})

test('set_state puts a place in the chosen state without toggling', () => {
  const { result } = renderHook(() => use_spot_actions())
  act(() => result.current.set_state(kopi, 'targeted'))
  act(() => result.current.set_state(kopi, 'targeted'))
  expect(result.current.state_of('kopi-kin')).toBe('targeted')
  expect(result.current.spots).toHaveLength(1)
  act(() => result.current.set_state(kopi, 'conquered'))
  expect(result.current.state_of('kopi-kin')).toBe('conquered')
  act(() => result.current.set_state(kopi, 'targeted'))
  expect(result.current.state_of('kopi-kin')).toBe('targeted')
})

test('remove_place deletes the spot for a place, and does nothing for a place that is not a spot', () => {
  const { result } = renderHook(() => use_spot_actions())
  act(() => result.current.remove_place(kopi))
  expect(result.current.spots).toHaveLength(0)
  act(() => result.current.set_state(kopi, 'conquered'))
  act(() => result.current.remove_place(kopi))
  expect(result.current.spots).toHaveLength(0)
})
