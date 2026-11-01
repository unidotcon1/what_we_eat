import { useSyncExternalStore } from 'react'

const MESSAGE = 'Some of your spots could not be saved to your account. They are still saved on this device, and we will try again next time.'

let problem: string | null = null
const listeners = new Set<() => void>()

function set(next: string | null) {
  if (next === problem) return
  problem = next
  listeners.forEach((l) => l())
}

/** Remembers that saving to the account failed. The database's own message stays out of sight: it can mention table and column names. */
export function report_sync_problem(_error: unknown) {
  set(MESSAGE)
}

export const has_sync_problem = () => problem !== null

export function clear_sync_problem() {
  set(null)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function use_sync_problem(): string | null {
  return useSyncExternalStore(subscribe, () => problem)
}

export function reset_sync_status_for_test() {
  problem = null
  listeners.clear()
}
