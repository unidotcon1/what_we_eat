import { useSyncExternalStore } from 'react'

function read(key: string): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // storage blocked or full: the in-memory copy still works for this session
  }
}

/** A list of ids kept in memory and mirrored to localStorage; every hook instance shares it. */
function createListStore(key: string) {
  let items: string[] | undefined
  const listeners = new Set<() => void>()
  const get = () => (items ??= read(key))
  const set = (next: string[]) => {
    items = next
    write(key, JSON.stringify(next))
    listeners.forEach((l) => l())
  }
  return {
    get,
    subscribe(l: () => void) {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    toggle(id: string) {
      const cur = get()
      set(cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id])
    },
    clear: () => set([]),
    reset() {
      items = undefined
      listeners.clear()
    },
  }
}

const saves = createListStore('wwe.saves')
const shortlist = createListStore('wwe.shortlist')

export function useSaves() {
  const list = useSyncExternalStore(saves.subscribe, saves.get)
  return { saved: new Set(list), toggle: saves.toggle }
}

export function useShortlist() {
  const ids = useSyncExternalStore(shortlist.subscribe, shortlist.get)
  return { ids, toggle: shortlist.toggle, clear: shortlist.clear }
}

/** Ids saved on this device, for merging into an account after sign-in. */
export const getLocalSaves = () => saves.get()
export const clearLocalSaves = () => saves.clear()

export function getVoterToken(): string {
  try {
    let token = localStorage.getItem('wwe.voter')
    if (!token) {
      token = crypto.randomUUID()
      localStorage.setItem('wwe.voter', token)
    }
    return token
  } catch {
    return (memoryToken ??= crypto.randomUUID())
  }
}
let memoryToken: string | undefined

export function resetStoresForTest() {
  saves.reset()
  shortlist.reset()
  memoryToken = undefined
}
