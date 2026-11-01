import {
  LEGACY_SAVE_STATE,
  count_spots,
  diff_spots,
  find_spot,
  merge_spots,
  migrate_legacy_saves,
  move_spot,
  remove_spot,
  set_spot_state,
  spot_input_from_restaurant,
  spots_in_state,
  toggle_spot_state,
  type NewSpot,
  type Spot,
} from './spots'
import type { Restaurant } from './types'

const t0 = '2026-11-01T10:00:00.000Z'
const t1 = '2026-11-02T10:00:00.000Z'
const t2 = '2026-11-03T10:00:00.000Z'

const kopi: NewSpot = { place_id: 'kopi-kin', name: 'Kopi & Kin', address: 'Tiong Bahru', lat: 1.2862, lng: 103.8326, source: 'catalog' }
const manual: NewSpot = { place_id: null, name: "Ah Ma's Kitchen", address: '', lat: 1.3, lng: 103.85, source: 'manual' }

describe('adding', () => {
  test('a new place is added once, in the state asked for', () => {
    const out = set_spot_state([], kopi, 'targeted', t0)
    expect(out.outcome).toBe('added')
    expect(out.spots).toHaveLength(1)
    expect(out.spot).toMatchObject({ id: 'r:kopi-kin', place_id: 'kopi-kin', state: 'targeted', conquered_at: null, created_at: t0, updated_at: t0 })
  })

  test('adding straight to Conquered stamps conquered_at', () => {
    const out = set_spot_state([], kopi, 'conquered', t0)
    expect(out.spot.conquered_at).toBe(t0)
  })

  test('the same catalogue place is never stored twice', () => {
    const first = set_spot_state([], kopi, 'targeted', t0)
    const again = set_spot_state(first.spots, kopi, 'targeted', t1)
    expect(again.outcome).toBe('unchanged')
    expect(again.spots).toHaveLength(1)
  })

  test('a manual place gets its own id, and the same name at the same spot is the same place', () => {
    const first = set_spot_state([], manual, 'targeted', t0)
    expect(first.spot.id.startsWith('m:')).toBe(true)
    const near = { ...manual, name: "AH MA'S KITCHEN", lat: 1.30005, lng: 103.85005 }
    const again = set_spot_state(first.spots, near, 'conquered', t1)
    expect(again.spots).toHaveLength(1)
    expect(again.outcome).toBe('moved')
  })

  test('the same name at a different location is a different place', () => {
    const first = set_spot_state([], manual, 'targeted', t0)
    const far = { ...manual, lat: 1.35, lng: 103.9 }
    expect(set_spot_state(first.spots, far, 'targeted', t1).spots).toHaveLength(2)
  })

  test('find_spot finds by catalogue id and by name plus nearness', () => {
    const { spots } = set_spot_state(set_spot_state([], kopi, 'targeted', t0).spots, manual, 'targeted', t0)
    expect(find_spot(spots, kopi)?.place_id).toBe('kopi-kin')
    expect(find_spot(spots, { ...manual, lat: 1.30001 })?.name).toBe("Ah Ma's Kitchen")
    expect(find_spot(spots, { ...manual, name: 'Someone Else' })).toBeUndefined()
  })
})

describe('moving between states', () => {
  test('Targeted to Conquered stamps conquered_at and updated_at', () => {
    const a = set_spot_state([], kopi, 'targeted', t0)
    const moved = move_spot(a.spots, a.spot.id, 'conquered', t1)
    expect(moved[0]).toMatchObject({ state: 'conquered', conquered_at: t1, updated_at: t1, created_at: t0 })
  })

  test('Conquered back to Targeted clears conquered_at', () => {
    const a = set_spot_state([], kopi, 'conquered', t0)
    const moved = move_spot(a.spots, a.spot.id, 'targeted', t1)
    expect(moved[0]).toMatchObject({ state: 'targeted', conquered_at: null, updated_at: t1 })
  })

  test('moving to the state it is already in changes nothing', () => {
    const a = set_spot_state([], kopi, 'conquered', t0)
    expect(move_spot(a.spots, a.spot.id, 'conquered', t2)).toEqual(a.spots)
  })

  test('moving an unknown id changes nothing and does not crash', () => {
    const a = set_spot_state([], kopi, 'targeted', t0)
    expect(move_spot(a.spots, 'nope', 'conquered', t1)).toEqual(a.spots)
  })

  test('adding a place that is already Conquered as Targeted can be told not to downgrade it', () => {
    const a = set_spot_state([], kopi, 'conquered', t0)
    const out = set_spot_state(a.spots, kopi, 'targeted', t1, { never_downgrade: true })
    expect(out.outcome).toBe('kept')
    expect(out.spots[0].state).toBe('conquered')
  })

  test('without that option a place does move back to Targeted', () => {
    const a = set_spot_state([], kopi, 'conquered', t0)
    expect(set_spot_state(a.spots, kopi, 'targeted', t1).spots[0].state).toBe('targeted')
  })
})

describe('deleting and toggling', () => {
  test('remove_spot deletes by id and leaves the others', () => {
    const a = set_spot_state(set_spot_state([], kopi, 'targeted', t0).spots, manual, 'conquered', t0)
    const out = remove_spot(a.spots, 'r:kopi-kin')
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe("Ah Ma's Kitchen")
  })

  test('toggle_spot_state adds, then removes when the same state is pressed again', () => {
    const on = toggle_spot_state([], kopi, 'targeted', t0)
    expect(on).toHaveLength(1)
    expect(toggle_spot_state(on, kopi, 'targeted', t1)).toHaveLength(0)
  })

  test('toggle_spot_state moves a spot when the other state is pressed', () => {
    const on = toggle_spot_state([], kopi, 'targeted', t0)
    const moved = toggle_spot_state(on, kopi, 'conquered', t1)
    expect(moved).toHaveLength(1)
    expect(moved[0].state).toBe('conquered')
  })
})

describe('counting and listing', () => {
  const list = (): Spot[] => {
    let spots: Spot[] = []
    spots = set_spot_state(spots, kopi, 'conquered', t0).spots
    spots = set_spot_state(spots, manual, 'targeted', t1).spots
    spots = set_spot_state(spots, { ...manual, name: 'Second', lat: 1.4 }, 'targeted', t2).spots
    return spots
  }

  test('count_spots counts each state', () => {
    expect(count_spots(list())).toEqual({ conquered: 1, targeted: 2 })
    expect(count_spots([])).toEqual({ conquered: 0, targeted: 0 })
  })

  test('spots_in_state lists the newest first', () => {
    expect(spots_in_state(list(), 'targeted').map((s) => s.name)).toEqual(['Second', "Ah Ma's Kitchen"])
  })
})

describe('merging device and account copies', () => {
  const base = set_spot_state([], kopi, 'targeted', t0).spots

  test('places only on one side are all kept', () => {
    const other = set_spot_state([], manual, 'targeted', t0).spots
    expect(merge_spots(base, other)).toHaveLength(2)
  })

  test('on a clash the newer change wins', () => {
    const newer = move_spot(base, 'r:kopi-kin', 'conquered', t2)
    expect(merge_spots(base, newer)[0].state).toBe('conquered')
    expect(merge_spots(newer, base)[0].state).toBe('conquered')
  })
})

describe('diff_spots', () => {
  test('lists what to write up and what to delete after a change', () => {
    const before = set_spot_state(set_spot_state([], kopi, 'targeted', t0).spots, manual, 'targeted', t0).spots
    const after = move_spot(remove_spot(before, 'r:kopi-kin'), before[1].id, 'conquered', t1)
    const out = diff_spots(before, after)
    expect(out.upserts.map((s) => s.name)).toEqual(["Ah Ma's Kitchen"])
    expect(out.deletes).toEqual(['r:kopi-kin'])
  })

  test('no change means an empty diff', () => {
    const list = set_spot_state([], kopi, 'targeted', t0).spots
    expect(diff_spots(list, list)).toEqual({ upserts: [], deletes: [] })
  })

  test('a brand new spot is an upsert', () => {
    const after = set_spot_state([], kopi, 'targeted', t0).spots
    expect(diff_spots([], after).upserts).toHaveLength(1)
  })
})

describe('legacy saves', () => {
  const catalog: Restaurant[] = [
    { id: 'kopi-kin', name: 'Kopi & Kin', area: 'Tiong Bahru', lat: 1.2862, lng: 103.8326, priceBand: 1, cuisine: 'Cafe', tags: [], closed: false },
  ]

  test('existing saves become spots in the legacy state (Targeted)', () => {
    expect(LEGACY_SAVE_STATE).toBe('targeted')
    const { spots, skipped } = migrate_legacy_saves(['kopi-kin'], catalog, t0)
    expect(spots).toHaveLength(1)
    expect(spots[0]).toMatchObject({ id: 'r:kopi-kin', state: 'targeted', source: 'legacy_save', name: 'Kopi & Kin' })
    expect(skipped).toEqual([])
  })

  test('a saved id that is no longer in the catalogue is reported, not lost silently', () => {
    expect(migrate_legacy_saves(['gone'], catalog, t0)).toEqual({ spots: [], skipped: ['gone'] })
  })

  test('spot_input_from_restaurant carries over the facts', () => {
    expect(spot_input_from_restaurant(catalog[0])).toEqual(kopi)
  })
})
