import sample from './sample-restaurants.json'
import type { Hours, PriceBand, Restaurant } from '../domain/types'
import { getClient } from './supabase'

/** The slice of the Supabase client this module needs. */
export type RestaurantSource = {
  from(table: 'restaurants'): {
    select(columns: string): PromiseLike<{ data: DbRestaurant[] | null; error: { message: string } | null }>
  }
}

type DbRestaurant = {
  id: string
  name: string
  area: string
  lat: number
  lng: number
  price_band: number
  cuisine: string
  tags: string[] | null
  hours: Hours | null
  closed: boolean
}

export async function fetchRestaurants(source: RestaurantSource | null = getClient() as unknown as RestaurantSource | null): Promise<Restaurant[]> {
  if (!source) return sample as unknown as Restaurant[]
  const { data, error } = await source.from('restaurants').select('*')
  if (error) throw new Error(`Could not load restaurants: ${error.message}`)
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    area: r.area,
    lat: r.lat,
    lng: r.lng,
    priceBand: r.price_band as PriceBand,
    cuisine: r.cuisine,
    tags: r.tags ?? [],
    hours: r.hours ?? undefined,
    closed: r.closed,
  }))
}
