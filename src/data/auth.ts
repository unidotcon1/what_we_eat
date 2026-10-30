import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getLocalSaves } from '../local/store'
import { getClient } from './supabase'

export type User = { id: string; email: string }
export type MyStats = { points: number; saves: number; reviews: number }

export const accountsAvailable = () => getClient() !== null

/** Copies this device's saves into the account and claims each first-save bonus (the database makes both idempotent). */
export async function mergeLocalSaves(client: SupabaseClient, userId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const { error } = await client
    .from('saves')
    .upsert(ids.map((restaurant_id) => ({ user_id: userId, restaurant_id })), {
      onConflict: 'user_id,restaurant_id',
      ignoreDuplicates: true,
    })
  if (error) throw new Error(`Could not sync saves: ${error.message}`)
  for (const id of ids) {
    await client.rpc('claim_first_save', { p_restaurant: id })
  }
}

/** redirectPath is where the user lands after signing in (default: the Me page). */
export async function signInWithGoogle(redirectPath = '/me'): Promise<void> {
  const client = getClient()
  if (!client) return
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}${redirectPath}` },
  })
  if (error) throw new Error(error.message)
}

export async function signOut(): Promise<void> {
  await getClient()?.auth.signOut()
}

export function useUser(): { user: User | null; ready: boolean } {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const client = getClient()
    if (!client) {
      setReady(true)
      return
    }
    const toUser = (u: { id: string; email?: string } | undefined | null): User | null =>
      u ? { id: u.id, email: u.email ?? '' } : null
    client.auth.getSession().then(({ data }) => {
      setUser(toUser(data.session?.user))
      setReady(true)
    })
    const { data: sub } = client.auth.onAuthStateChange((event, session) => {
      setUser(toUser(session?.user))
      if (event === 'SIGNED_IN' && session?.user) {
        // device saves stay in place; the database ignores duplicates, so re-running is safe
        mergeLocalSaves(client, session.user.id, getLocalSaves()).catch(() => undefined)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return { user, ready }
}

export async function fetchMyStats(): Promise<MyStats> {
  const client = getClient()
  if (!client) return { points: 0, saves: 0, reviews: 0 }
  return fetchMyStatsFrom(client)
}

export async function fetchMyStatsFrom(client: SupabaseClient): Promise<MyStats> {
  const { data } = await client.auth.getUser()
  if (!data.user) return { points: 0, saves: 0, reviews: 0 }
  const [points, saves, reviews] = await Promise.all([
    client.rpc('my_points'),
    client.from('saves').select('*', { count: 'exact', head: true }),
    // approved reviews by everyone are readable, so count only this user's own
    client.from('reviews').select('*', { count: 'exact', head: true }).eq('user_id', data.user.id),
  ])
  return { points: (points.data as number | null) ?? 0, saves: saves.count ?? 0, reviews: reviews.count ?? 0 }
}
