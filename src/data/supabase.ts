import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null | undefined

/** Returns the Supabase client, or null when the env vars are missing (the app then uses sample data). */
export function getClient(): SupabaseClient | null {
  if (client !== undefined) return client
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  // PKCE keeps the sign-in token out of the page address
  client = url && key ? createClient(url, key, { auth: { flowType: 'pkce' } }) : null
  return client
}
