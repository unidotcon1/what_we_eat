import { useUser } from '../data/auth'
import { claim_points_for_new, push_changes } from '../data/spots'
import { getClient } from '../data/supabase'
import {
  diff_spots,
  move_spot,
  remove_spot,
  set_spot_state,
  spot_input_from_restaurant,
  toggle_spot_state,
  type Spot,
  type SpotState,
} from '../domain/spots'
import type { Restaurant } from '../domain/types'
import { get_spots, set_spots, use_spots } from '../local/spots_store'

/** Everything the screens do with Spots. Changes are saved on the device at once and, when signed in, written to the account. */
export function use_spot_actions() {
  const spots = use_spots()
  const { user } = useUser()

  function commit(next: Spot[]) {
    const prev = get_spots()
    set_spots(next)
    if (!user) return
    const client = getClient()
    if (!client) return
    push_changes(client, user.id, diff_spots(prev, next)).catch(() => undefined)
    const added = next.filter((s) => !prev.some((p) => p.id === s.id))
    if (added.length) claim_points_for_new(client, added).catch(() => undefined)
  }

  const now = () => new Date().toISOString()

  return {
    spots,
    state_of(place_id: string): SpotState | undefined {
      return spots.find((s) => s.place_id === place_id)?.state
    },
    /** Target button on a card: adds a Target, removes it if it already is one, and moves a Conquered Spot back to Target. */
    toggle_target(r: Restaurant) {
      commit(toggle_spot_state(get_spots(), spot_input_from_restaurant(r), 'targeted', now()))
    },
    conquer(r: Restaurant) {
      commit(set_spot_state(get_spots(), spot_input_from_restaurant(r), 'conquered', now()).spots)
    },
    /** Saves a whole new list at once (used by the import). */
    commit_spots(next: Spot[]) {
      commit(next)
    },
    move(id: string, state: SpotState) {
      commit(move_spot(get_spots(), id, state, now()))
    },
    remove(id: string) {
      commit(remove_spot(get_spots(), id))
    },
  }
}
