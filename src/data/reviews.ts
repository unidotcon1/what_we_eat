import type { SupabaseClient } from '@supabase/supabase-js'
import { validateReview } from '../domain/reviews'
import { getClient } from './supabase'

export type ApprovedReview = { id: string; rating: number; body: string }

/** Inserts a pending review for the signed-in user; it shows up once approved in the Supabase dashboard. */
export async function submitReview(client: SupabaseClient, restaurantId: string, rating: number, body: string) {
  const invalid = validateReview(rating, body)
  if (invalid) throw new Error(invalid)
  const { data } = await client.auth.getUser()
  if (!data.user) throw new Error('Sign in to write a review')
  const { error } = await client
    .from('reviews')
    .insert({ user_id: data.user.id, restaurant_id: restaurantId, rating, body: body.trim() })
  if (error) throw new Error(`Could not save your review: ${error.message}`)
}

export async function submitReviewForCurrentClient(restaurantId: string, rating: number, body: string) {
  const client = getClient()
  if (!client) throw new Error('Reviews need the online database, which is not set up yet')
  return submitReview(client, restaurantId, rating, body)
}

export async function fetchApprovedReviews(restaurantId: string): Promise<ApprovedReview[]> {
  const client = getClient()
  if (!client) return []
  const { data, error } = await client
    .from('reviews')
    .select('id,rating,body')
    .eq('restaurant_id', restaurantId)
    .eq('approved', true)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Could not load reviews: ${error.message}`)
  return (data ?? []) as ApprovedReview[]
}
