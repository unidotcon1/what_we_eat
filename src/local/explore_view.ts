import { useSyncExternalStore } from 'react'

export type ExploreView = 'details' | 'images'

const KEY = 'wwe.explore_view'

let current: ExploreView | undefined
const listeners = new Set<() => void>()

function read(): ExploreView {
  try {
    return localStorage.getItem(KEY) === 'images' ? 'images' : 'details'
  } catch {
    return 'details'
  }
}

export function get_explore_view(): ExploreView {
  return (current ??= read())
}

export function set_explore_view(view: ExploreView) {
  current = view
  try {
    localStorage.setItem(KEY, view)
  } catch {
    // storage blocked: the choice still holds for this visit
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The person's choice between the detailed list and the image layout on Explore. */
export function use_explore_view(): ExploreView {
  return useSyncExternalStore(subscribe, get_explore_view)
}

export function reset_explore_view_for_test() {
  current = undefined
  listeners.clear()
}
