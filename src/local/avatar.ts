import { useSyncExternalStore } from 'react'
import { DEFAULT_AVATAR, clean_avatar, parse_avatar, type Avatar } from '../domain/avatar'

const KEY = 'wwe.avatar'

let current: Avatar | undefined
const listeners = new Set<() => void>()

function read(): Avatar {
  try {
    return parse_avatar(localStorage.getItem(KEY))
  } catch {
    return DEFAULT_AVATAR
  }
}

export function get_avatar(): Avatar {
  return (current ??= read())
}

export function set_avatar(avatar: Avatar) {
  current = clean_avatar(avatar)
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    // storage blocked: the picture still holds for this visit
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The person's designed profile picture, kept on this device. */
export function use_avatar(): Avatar {
  return useSyncExternalStore(subscribe, get_avatar)
}

export function reset_avatar_for_test() {
  current = undefined
  listeners.clear()
}
