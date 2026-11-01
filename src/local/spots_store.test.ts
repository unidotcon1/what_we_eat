import { act, renderHook } from '@testing-library/react'
import { get_spots, reset_spots_store_for_test, run_legacy_migration, set_spots, use_spots } from './spots_store'
import { set_spot_state, type Spot } from '../domain/spots'
import type { Restaurant } from '../domain/types'

const now = '2026-11-01T10:00:00.000Z'
const later = '2026-11-02T10:00:00.000Z'

const catalog: Restaurant[] = [
  { id: 'kopi-kin', name: 'Kopi & Kin', area: 'Tiong Bahru', lat: 1.2862, lng: 103.8326, priceBand: 1, cuisine: 'Cafe', tags: [], closed: false },
  { id: 'long-table', name: 'Long Table Hotpot', area: 'Bugis', lat: 1.3009, lng: 103.8559, priceBand: 2, cuisine: 'Chinese', tags: [], closed: false },
]
const kopi_input = { place_id: 'kopi-kin', name: 'Kopi & Kin', lat: 1.2862, lng: 103.8326, source: 'catalog' as const }

beforeEach(() => {
  localStorage.clear()
  reset_spots_store_for_test()
})

test('spots persist across a reload', () => {
  set_spots(set_spot_state([], kopi_input, 'conquered', now).spots)
  reset_spots_store_for_test()
  expect(get_spots()).toHaveLength(1)
  expect(get_spots()[0].state).toBe('conquered')
})

test('hooks on different screens stay in step', () => {
  const a = renderHook(() => use_spots())
  const b = renderHook(() => use_spots())
  act(() => set_spots(set_spot_state([], kopi_input, 'targeted', now).spots))
  expect(a.result.current).toHaveLength(1)
  expect(b.result.current).toHaveLength(1)
})

test('corrupt or malicious storage gives an empty list, and bad entries are dropped', () => {
  for (const bad of ['{not json', '"x"', '42', 'null', '{"a":1}']) {
    localStorage.setItem('wwe.spots', bad)
    reset_spots_store_for_test()
    expect(get_spots()).toEqual([])
  }
  const good = set_spot_state([], kopi_input, 'targeted', now).spots[0]
  localStorage.setItem('wwe.spots', JSON.stringify([good, { id: 1 }, null, { ...good, id: 'r:x', state: 'admin' }, { ...good, id: 'r:y', lat: 'north' }]))
  reset_spots_store_for_test()
  expect(get_spots().map((s) => s.id)).toEqual(['r:kopi-kin'])
})

test('storage that throws does not crash the app, and the list still works in memory', () => {
  const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota')
  })
  expect(() => set_spots(set_spot_state([], kopi_input, 'targeted', now).spots)).not.toThrow()
  expect(get_spots()).toHaveLength(1)
  spy.mockRestore()
})

describe('run_legacy_migration', () => {
  test('old saves on this device become Targeted spots, once, and the old key is left alone', () => {
    localStorage.setItem('wwe.saves', JSON.stringify(['kopi-kin', 'long-table']))
    const first = run_legacy_migration(catalog, now)
    expect(first).toEqual({ ran: true, migrated: 2, skipped: [] })
    expect(get_spots().map((s) => [s.id, s.state, s.source])).toEqual([
      ['r:kopi-kin', 'targeted', 'legacy_save'],
      ['r:long-table', 'targeted', 'legacy_save'],
    ])
    expect(localStorage.getItem('wwe.saves')).toBe(JSON.stringify(['kopi-kin', 'long-table']))
    expect(run_legacy_migration(catalog, later)).toMatchObject({ ran: false })
    expect(get_spots()).toHaveLength(2)
  })

  test('a place already stored as a spot keeps its state and is not overwritten by the old save', () => {
    set_spots(set_spot_state([], kopi_input, 'conquered', now).spots)
    localStorage.setItem('wwe.saves', JSON.stringify(['kopi-kin']))
    run_legacy_migration(catalog, later)
    expect(get_spots()).toHaveLength(1)
    expect(get_spots()[0]).toMatchObject({ state: 'conquered', updated_at: now })
  })

  test('saved ids missing from the catalogue are reported and the old key is kept', () => {
    localStorage.setItem('wwe.saves', JSON.stringify(['kopi-kin', 'gone']))
    expect(run_legacy_migration(catalog, now)).toMatchObject({ migrated: 1, skipped: ['gone'] })
    expect(localStorage.getItem('wwe.saves')).toContain('gone')
  })

  test('with an empty catalogue it waits instead of marking the migration done', () => {
    localStorage.setItem('wwe.saves', JSON.stringify(['kopi-kin']))
    expect(run_legacy_migration([], now)).toMatchObject({ ran: false })
    expect(run_legacy_migration(catalog, now)).toMatchObject({ ran: true, migrated: 1 })
  })

  test('with no old saves it just marks itself done', () => {
    expect(run_legacy_migration(catalog, now)).toEqual({ ran: true, migrated: 0, skipped: [] })
    expect(get_spots()).toEqual([])
  })

  test('corrupt old saves do not crash it', () => {
    localStorage.setItem('wwe.saves', '{oops')
    expect(run_legacy_migration(catalog, now)).toMatchObject({ ran: true, migrated: 0 })
  })
})

test('the spots written are the spots read back', () => {
  const s: Spot = set_spot_state([], kopi_input, 'targeted', now).spots[0]
  set_spots([s])
  expect(get_spots()[0]).toEqual(s)
})
