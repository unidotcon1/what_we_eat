import { useSyncExternalStore } from 'react'
import { parse_travel_mode, type TravelMode } from '../domain/directions'

const KEY = 'wwe.travel_mode'

let current: TravelMode | undefined
const listeners = new Set<() => void>()

function read(): TravelMode {
  try {
    return parse_travel_mode(localStorage.getItem(KEY))
  } catch {
    return 'transit'
  }
}

export function get_travel_mode(): TravelMode {
  return (current ??= read())
}

export function set_travel_mode(mode: TravelMode) {
  current = mode
  try {
    localStorage.setItem(KEY, mode)
  } catch {
    // storage blocked: the choice still holds for this visit
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** How the person usually gets to a restaurant. It decides the Google Maps link. */
export function use_travel_mode(): TravelMode {
  return useSyncExternalStore(subscribe, get_travel_mode)
}

export function reset_travel_mode_for_test() {
  current = undefined
  listeners.clear()
}
