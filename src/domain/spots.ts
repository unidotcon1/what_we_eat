import { distanceKm } from './filters'
import { normalise_name } from './text'
import type { Restaurant } from './types'

export type SpotState = 'conquered' | 'targeted'
export type SpotSource = 'catalog' | 'pin' | 'manual' | 'import' | 'legacy_save'

/** One place the owner has been to (conquered) or wants to go to (targeted). A place is stored once. */
export type Spot = {
  id: string
  place_id: string | null
  name: string
  address: string
  lat: number
  lng: number
  state: SpotState
  source: SpotSource
  created_at: string
  updated_at: string
  conquered_at: string | null
}

export type NewSpot = {
  place_id?: string | null
  name: string
  address?: string
  lat: number
  lng: number
  source: SpotSource
}

/** Saves from before spots existed were "want to go" hearts, so they become Targeted. Flip here if that is wrong. */
export const LEGACY_SAVE_STATE: SpotState = 'targeted'

const SAME_PLACE_KM = 0.03

export function spot_input_from_restaurant(r: Restaurant): NewSpot {
  return { place_id: r.id, name: r.name, address: r.area, lat: r.lat, lng: r.lng, source: 'catalog' }
}

/** Finds the spot for a place: by catalogue id, or by the same name within about 30 metres. */
export function find_spot(spots: Spot[], input: NewSpot): Spot | undefined {
  if (input.place_id) return spots.find((s) => s.place_id === input.place_id)
  const name = normalise_name(input.name)
  if (!name) return undefined
  return spots.find((s) => normalise_name(s.name) === name && distanceKm(s, input) <= SAME_PLACE_KM)
}

export type SetOutcome = 'added' | 'moved' | 'unchanged' | 'kept'

export function move_spot(spots: Spot[], id: string, state: SpotState, now: string): Spot[] {
  return spots.map((s) =>
    s.id !== id || s.state === state
      ? s
      : { ...s, state, updated_at: now, conquered_at: state === 'conquered' ? now : null },
  )
}

/** Puts a place in a state: adds it, or moves it if it is already stored. */
export function set_spot_state(
  spots: Spot[],
  input: NewSpot,
  state: SpotState,
  now: string,
  options: { never_downgrade?: boolean } = {},
): { spots: Spot[]; spot: Spot; outcome: SetOutcome } {
  const existing = find_spot(spots, input)
  if (!existing) {
    const spot: Spot = {
      id: input.place_id ? `r:${input.place_id}` : `m:${crypto.randomUUID()}`,
      place_id: input.place_id ?? null,
      name: input.name,
      address: input.address ?? '',
      lat: input.lat,
      lng: input.lng,
      state,
      source: input.source,
      created_at: now,
      updated_at: now,
      conquered_at: state === 'conquered' ? now : null,
    }
    return { spots: [...spots, spot], spot, outcome: 'added' }
  }
  if (existing.state === state) return { spots, spot: existing, outcome: 'unchanged' }
  if (options.never_downgrade && existing.state === 'conquered') return { spots, spot: existing, outcome: 'kept' }
  const moved = move_spot(spots, existing.id, state, now)
  return { spots: moved, spot: moved.find((s) => s.id === existing.id)!, outcome: 'moved' }
}

export function remove_spot(spots: Spot[], id: string): Spot[] {
  return spots.filter((s) => s.id !== id)
}

/** Card buttons: pressing the state a place is already in removes it; pressing the other state moves it. */
export function toggle_spot_state(spots: Spot[], input: NewSpot, state: SpotState, now: string): Spot[] {
  const existing = find_spot(spots, input)
  if (existing && existing.state === state) return remove_spot(spots, existing.id)
  return set_spot_state(spots, input, state, now).spots
}

export function count_spots(spots: Spot[]): Record<SpotState, number> {
  return {
    conquered: spots.filter((s) => s.state === 'conquered').length,
    targeted: spots.filter((s) => s.state === 'targeted').length,
  }
}

export function spots_in_state(spots: Spot[], state: SpotState): Spot[] {
  return spots
    .filter((s) => s.state === state)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at) || a.name.localeCompare(b.name))
}

/** Joins the device copy and the account copy: every place is kept, and on a clash the newer change wins. */
export function merge_spots(a: Spot[], b: Spot[]): Spot[] {
  const by_id = new Map<string, Spot>()
  for (const s of [...a, ...b]) {
    const have = by_id.get(s.id)
    if (!have || s.updated_at > have.updated_at) by_id.set(s.id, s)
  }
  return [...by_id.values()]
}

export function migrate_legacy_saves(
  save_ids: string[],
  catalog: Restaurant[],
  now: string,
): { spots: Spot[]; skipped: string[] } {
  let spots: Spot[] = []
  const skipped: string[] = []
  for (const id of save_ids) {
    const r = catalog.find((c) => c.id === id)
    if (!r) {
      skipped.push(id)
      continue
    }
    spots = set_spot_state(spots, { ...spot_input_from_restaurant(r), source: 'legacy_save' }, LEGACY_SAVE_STATE, now).spots
  }
  return { spots, skipped }
}

const STATES: string[] = ['conquered', 'targeted']
const SOURCES: string[] = ['catalog', 'pin', 'manual', 'import', 'legacy_save']

/** True only for a well-formed spot, so anything read back from storage or the network can be trusted. */
export function is_spot(value: unknown): value is Spot {
  if (value === null || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  const text = (x: unknown) => typeof x === 'string'
  const finite = (x: unknown) => typeof x === 'number' && Number.isFinite(x)
  return (
    text(v.id) && (v.id as string) !== '' &&
    (v.place_id === null || text(v.place_id)) &&
    text(v.name) && text(v.address) &&
    finite(v.lat) && finite(v.lng) &&
    text(v.state) && STATES.includes(v.state as string) &&
    text(v.source) && SOURCES.includes(v.source as string) &&
    text(v.created_at) && text(v.updated_at) &&
    (v.conquered_at === null || text(v.conquered_at))
  )
}

/** What to write to the account after a change: spots to upsert and ids to delete. */
export function diff_spots(prev: Spot[], next: Spot[]): { upserts: Spot[]; deletes: string[] } {
  const before = new Map(prev.map((s) => [s.id, s]))
  const after_ids = new Set(next.map((s) => s.id))
  return {
    upserts: next.filter((s) => before.get(s.id)?.updated_at !== s.updated_at),
    deletes: prev.filter((s) => !after_ids.has(s.id)).map((s) => s.id),
  }
}
