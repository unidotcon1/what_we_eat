import type { Restaurant } from '../domain/types'
import { fetchRestaurants } from './restaurants'

let cached: Promise<Restaurant[]> | null = null

/** The restaurant catalogue, fetched once per visit and shared by every screen. A failure is not remembered. */
export function get_catalog(fetcher: () => Promise<Restaurant[]> = () => fetchRestaurants()): Promise<Restaurant[]> {
  if (!cached) {
    cached = fetcher().catch((e: unknown) => {
      cached = null
      throw e
    })
  }
  return cached
}

export function reset_catalog_cache_for_test() {
  cached = null
}
