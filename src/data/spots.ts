import type { SupabaseClient } from '@supabase/supabase-js'
import { is_spot, merge_spots, type Spot } from '../domain/spots'

/** Postgres returns timestamps like 2026-11-01T10:00:00+00:00; store one format so they compare correctly. */
function iso(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const t = new Date(value)
  return Number.isNaN(t.getTime()) ? value : t.toISOString()
}

function to_spot(row: Record<string, unknown>): unknown {
  return {
    id: row.id,
    place_id: row.place_id ?? null,
    name: row.name,
    address: row.address ?? '',
    lat: row.lat,
    lng: row.lng,
    state: row.state,
    source: row.source,
    created_at: iso(row.created_at),
    updated_at: iso(row.updated_at),
    conquered_at: row.conquered_at == null ? null : iso(row.conquered_at),
  }
}

export async function fetch_remote_spots(client: SupabaseClient, user_id: string): Promise<Spot[]> {
  const { data, error } = await client.from('spots').select('*').eq('user_id', user_id)
  if (error) throw new Error(`Could not load your spots: ${error.message}`)
  return (data ?? []).map((row) => to_spot(row as Record<string, unknown>)).filter(is_spot)
}

const CHUNK = 200

type Row = Spot & { user_id: string }

/**
 * Writes spots in chunks. If a chunk is refused, each row is tried alone (and once more without its catalogue link),
 * so one bad row cannot stop the rest from reaching the account. Throws at the end if any row still failed.
 */
export async function push_changes(
  client: SupabaseClient,
  user_id: string,
  diff: { upserts: Spot[]; deletes: string[] },
): Promise<void> {
  const upsert = (rows: Row[]) => client.from('spots').upsert(rows, { onConflict: 'user_id,id' })
  const rows: Row[] = diff.upserts.map((s) => ({ ...s, user_id }))
  let failed = 0
  let first_message = ''
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    if (!(await upsert(chunk)).error) continue
    for (const row of chunk) {
      let { error } = await upsert([row])
      if (error && row.place_id) ({ error } = await upsert([{ ...row, place_id: null }])) // the place may have left our list
      if (error) {
        failed++
        first_message ||= error.message
      }
    }
  }
  for (const id of diff.deletes) {
    const { error } = await client.from('spots').delete().eq('user_id', user_id).eq('id', id)
    if (error) throw new Error(`Could not delete a spot: ${error.message}`)
  }
  if (failed) throw new Error(`Could not save ${failed} of ${rows.length} spots: ${first_message}`)
}

/** Joins the device copy with the account copy, writes up what the account is missing or has older, returns the union. */
export async function sync_spots(client: SupabaseClient, user_id: string, local: Spot[]): Promise<Spot[]> {
  const remote = await fetch_remote_spots(client, user_id)
  const merged = merge_spots(local, remote)
  const on_account = new Map(remote.map((s) => [s.id, s]))
  const to_push = merged.filter((s) => {
    const r = on_account.get(s.id)
    return !r || r.updated_at < s.updated_at
  })
  await push_changes(client, user_id, { upserts: to_push, deletes: [] })
  return merged
}

/** First time a catalogue place becomes a spot, ask the database for the once-only +5 (it ignores repeats). */
export async function claim_points_for_new(client: SupabaseClient, spots: Spot[]): Promise<void> {
  for (const s of spots) {
    if (!s.place_id) continue
    try {
      await client.rpc('claim_first_save', { p_restaurant: s.place_id })
    } catch {
      // points are a bonus; never let them block saving a spot
    }
  }
}
