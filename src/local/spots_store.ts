import { useSyncExternalStore } from 'react'
import { is_spot, migrate_legacy_saves, type Spot } from '../domain/spots'
import type { Restaurant } from '../domain/types'

const KEY = 'wwe.spots'
const MIGRATED_KEY = 'wwe.spots_migrated'
const LEGACY_KEY = 'wwe.saves'

let items: Spot[] | undefined
const listeners = new Set<() => void>()

function read(): Spot[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(is_spot) : []
  } catch {
    return []
  }
}

export function get_spots(): Spot[] {
  return (items ??= read())
}

export function set_spots(next: Spot[]) {
  items = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // storage blocked or full: the list still works for this visit
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function use_spots(): Spot[] {
  return useSyncExternalStore(subscribe, get_spots)
}

export function reset_spots_store_for_test() {
  items = undefined
  listeners.clear()
}

function legacy_ids(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/**
 * One-time move of the old heart-style saves into spots. The old key is never deleted.
 * Waits (does nothing, marks nothing) until the catalogue has loaded.
 */
export function run_legacy_migration(catalog: Restaurant[], now: string): { ran: boolean; migrated: number; skipped: string[] } {
  try {
    if (localStorage.getItem(MIGRATED_KEY) === '1') return { ran: false, migrated: 0, skipped: [] }
  } catch {
    // unreadable storage: fall through; already-stored places are skipped below
  }
  if (catalog.length === 0) return { ran: false, migrated: 0, skipped: [] }

  const { spots: migrated, skipped } = migrate_legacy_saves(legacy_ids(), catalog, now)
  const current = get_spots()
  const have = new Set(current.map((s) => s.id))
  const fresh = migrated.filter((s) => !have.has(s.id))
  if (fresh.length) set_spots([...current, ...fresh])
  try {
    localStorage.setItem(MIGRATED_KEY, '1')
  } catch {
    // fine: the migration is safe to repeat
  }
  return { ran: true, migrated: fresh.length, skipped }
}
