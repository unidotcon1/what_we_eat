import { useEffect, useMemo, useState } from 'react'
import { get_catalog } from '../../data/catalog'
import type { SpotState } from '../../domain/spots'
import type { Restaurant } from '../../domain/types'
import { MapView } from '../components/MapView'
import { use_spot_actions } from '../use_spot_actions'

export default function MapPage() {
  const [all, setAll] = useState<Restaurant[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { spots } = use_spot_actions()

  useEffect(() => {
    get_catalog().then(setAll, (e: Error) => setError(e.message))
  }, [])

  const states = useMemo(() => {
    const out: Record<string, SpotState> = {}
    for (const s of spots) if (s.place_id) out[s.place_id] = s.state
    return out
  }, [spots])

  const open_places = useMemo(() => (all ?? []).filter((r) => !r.closed), [all])

  if (error) return <p role="alert">{error}</p>
  if (!all) return <p>Loading…</p>

  return (
    <>
      <h1>Map</h1>
      <ul className="legend" aria-label="Pin key">
        <li>
          <span className="swatch targeted" aria-hidden="true" />
          Target
        </li>
        <li>
          <span className="swatch conquered" aria-hidden="true" />
          Conquered
        </li>
        <li>
          <span className="swatch" aria-hidden="true" />
          Not yet
        </li>
      </ul>
      <MapView items={open_places} states={states} />
    </>
  )
}
