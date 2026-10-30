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
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '{}')
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
      const { data: poll, error } = await client.from('polls').select('code,title,closed').eq('code', code).maybeSingle()
      check(error)
      if (!poll) return null
      const [options, votes] = await Promise.all([
        client.from('poll_options').select('id,restaurant_id').eq('poll_code', code).order('id'),
        client.from('votes').select('option_id').eq('poll_code', code),
      ])
      check(options.error)
      check(votes.error)
      return {
        code: poll.code,
        title: poll.title,
        closed: poll.closed,
        options: (options.data ?? []).map((o) => ({ id: o.id as string, restaurantId: o.restaurant_id as string })),
        votes: (votes.data ?? []).map((v) => ({ optionId: v.option_id as string })),
      }
    },
    async myVote(code, token) {
      const { data, error } = await client.rpc('my_vote', { p_code: code, p_token: token })
      check(error)
      return (data as string | null) ?? null
    },
    subscribe(code, cb) {
      const channel = client
        .channel(`votes-${code}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'votes', filter: `poll_code=eq.${code}` }, cb)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'polls', filter: `code=eq.${code}` }, cb)
        .subscribe()
      return () => void client.removeChannel(channel)
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
    return JSON.parse(localStorage.getItem(MINE_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function rememberPoll(code: string, title: string, role: MyPoll['role']) {
  const rest = listMyPolls().filter((p) => p.code !== code)
  try {
    localStorage.setItem(MINE_KEY, JSON.stringify([{ code, title, role }, ...rest]))
  } catch {
    // ignore: the Vote tab list is a convenience only
  }
}
