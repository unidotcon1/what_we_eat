import type { SupabaseClient } from '@supabase/supabase-js'
import { getClient } from './supabase'

export type PollView = {
  code: string
  title: string
  closed: boolean
  options: { id: string; restaurantId: string }[]
  votes: { optionId: string }[]
}

export interface PollApi {
  create(title: string, restaurantIds: string[], token: string): Promise<string>
  vote(code: string, optionId: string, token: string): Promise<void>
  close(code: string, token: string): Promise<void>
  get(code: string): Promise<PollView | null>
  myVote(code: string, token: string): Promise<string | null>
  isCreator(code: string, token: string): Promise<boolean>
  /** Calls cb whenever the poll may have changed; returns an unsubscribe function. */
  subscribe(code: string, cb: () => void): () => void
}

/* ---------- device-only polls, used when Supabase is not configured ---------- */

type LocalPoll = {
  title: string
  closed: boolean
  creator: string
  options: { id: string; restaurantId: string }[]
  votes: Record<string, string>
}

const LOCAL_KEY = 'wwe.localpolls'

function readLocal(): Record<string, LocalPoll> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '{}')
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, LocalPoll>) : {}
  } catch {
    return {}
  }
}

function writeLocal(all: Record<string, LocalPoll>) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all))
  } catch {
    // storage unavailable: polls only live for this page load
  }
}

export function localPolls(): PollApi {
  return {
    async create(title, restaurantIds, token) {
      const all = readLocal()
      const code = Math.random().toString(36).slice(2, 8)
      all[code] = {
        title,
        closed: false,
        creator: token,
        options: restaurantIds.map((restaurantId) => ({ id: crypto.randomUUID(), restaurantId })),
        votes: {},
      }
      writeLocal(all)
      return code
    },
    async vote(code, optionId, token) {
      const all = readLocal()
      const poll = all[code]
      if (!poll) throw new Error('unknown poll')
      if (poll.closed) throw new Error('poll is closed')
      if (!poll.options.some((o) => o.id === optionId)) throw new Error('unknown option')
      poll.votes[token] = optionId
      writeLocal(all)
    },
    async close(code, token) {
      const all = readLocal()
      if (all[code] && all[code].creator === token) {
        all[code].closed = true
        writeLocal(all)
      }
    },
    async get(code) {
      const p = readLocal()[code]
      if (!p) return null
      return {
        code,
        title: p.title,
        closed: p.closed,
        options: p.options,
        votes: Object.values(p.votes).map((optionId) => ({ optionId })),
      }
    },
    async myVote(code, token) {
      return readLocal()[code]?.votes[token] ?? null
    },
    async isCreator(code, token) {
      return readLocal()[code]?.creator === token
    },
    subscribe(_code, cb) {
      const id = setInterval(cb, 1500)
      return () => clearInterval(id)
    },
  }
}

/* ---------- Supabase polls (functions defined in 001_schema.sql) ---------- */

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

export function supabasePolls(client: SupabaseClient): PollApi {
  return {
    async create(title, restaurantIds, token) {
      const { data, error } = await client.rpc('create_poll', {
        p_title: title,
        p_restaurant_ids: restaurantIds,
        p_token: token,
      })
      check(error)
      return data as string
    },
    async vote(code, optionId, token) {
      const { error } = await client.rpc('cast_vote', { p_code: code, p_option: optionId, p_token: token })
      check(error)
    },
    async close(code, token) {
      const { error } = await client.rpc('close_poll', { p_code: code, p_token: token })
      check(error)
    },
    async get(code) {
      const { data, error } = await client.rpc('get_poll', { p_code: code })
      check(error)
      if (!data) return null
      const poll = data as {
        code: string
        title: string
        closed: boolean
        options: { id: string; restaurant_id: string }[]
        votes: { option_id: string }[]
      }
      return {
        code: poll.code,
        title: poll.title,
        closed: poll.closed,
        options: poll.options.map((o) => ({ id: o.id, restaurantId: o.restaurant_id })),
        votes: poll.votes.map((v) => ({ optionId: v.option_id })),
      }
    },
    async myVote(code, token) {
      const { data, error } = await client.rpc('my_vote', { p_code: code, p_token: token })
      check(error)
      return (data as string | null) ?? null
    },
    async isCreator(code, token) {
      const { data, error } = await client.rpc('is_poll_creator', { p_code: code, p_token: token })
      check(error)
      return data === true
    },
    // polls are private (no public table reads), so results refresh by asking again every few seconds
    subscribe(_code, cb) {
      const id = setInterval(cb, 3000)
      return () => clearInterval(id)
    },
  }
}

export function getPollApi(): PollApi {
  const client = getClient()
  return client ? supabasePolls(client) : localPolls()
}

/* ---------- polls this device created or joined (for the Vote tab) ---------- */

export type MyPoll = { code: string; title: string; role: 'created' | 'joined' }
const MINE_KEY = 'wwe.mypolls'

export function listMyPolls(): MyPoll[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(MINE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (p): p is MyPoll =>
        p !== null &&
        typeof p === 'object' &&
        typeof p.code === 'string' &&
        typeof p.title === 'string' &&
        (p.role === 'created' || p.role === 'joined'),
    )
  } catch {
    return []
  }
}

export function rememberPoll(code: string, title: string, role: MyPoll['role']) {
  const existing = listMyPolls().find((p) => p.code === code)
  const rest = listMyPolls().filter((p) => p.code !== code)
  const kept = existing?.role === 'created' ? 'created' : role
  try {
    localStorage.setItem(MINE_KEY, JSON.stringify([{ code, title, role: kept }, ...rest]))
  } catch {
    // ignore: the Vote tab list is a convenience only
  }
}
