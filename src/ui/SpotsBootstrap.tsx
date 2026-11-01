import { useEffect } from 'react'
import { useUser } from '../data/auth'
import { get_catalog } from '../data/catalog'
import { sync_spots } from '../data/spots'
import { getClient } from '../data/supabase'
import { get_spots, run_legacy_migration, set_spots } from '../local/spots_store'
import { clear_sync_problem, report_sync_problem } from '../local/sync_status'

/** Renders nothing. Moves old hearts into Spots once, and joins device spots with the account copy after sign-in. */
export function SpotsBootstrap() {
  const { user } = useUser()
  const user_id = user?.id

  useEffect(() => {
    let alive = true
    get_catalog()
      .then((catalog) => {
        if (alive) run_legacy_migration(catalog, new Date().toISOString())
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!user_id) return
    const client = getClient()
    if (!client) return
    let alive = true
    sync_spots(client, user_id, get_spots())
      .then((merged) => {
        if (!alive) return
        set_spots(merged)
        clear_sync_problem()
      })
      .catch(report_sync_problem) // the device copy keeps working
    return () => {
      alive = false
    }
  }, [user_id])

  return null
}
