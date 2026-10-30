import type { SupabaseClient } from '@supabase/supabase-js'
import { getClient } from './supabase'

/** Mirrors one save or unsave into the account; saving also claims the once-only first-save bonus. */
export async function syncSave(client: SupabaseClient, userId: string, restaurantId: string, saved: boolean) {
  if (saved) {
    const { error } = await client
      .from('saves')
      .upsert({ user_id: userId, restaurant_id: restaurantId }, { onConflict: 'user_id,restaurant_id', ignoreDuplicates: true })
    if (error) throw new Error(`Could not sync save: ${error.message}`)
    await client.rpc('claim_first_save', { p_restaurant: restaurantId })
  } else {
    const { error } = await client.from('saves').delete().eq('user_id', userId).eq('restaurant_id', restaurantId)
    if (error) throw new Error(`Could not sync save: ${error.message}`)
  }
}

export async function syncSaveForCurrentUser(userId: string, restaurantId: string, saved: boolean) {
  const client = getClient()
  if (client) await syncSave(client, userId, restaurantId, saved)
}
