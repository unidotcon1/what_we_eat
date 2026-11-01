import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Crosshair, FileUp, Flag } from 'lucide-react'
import { get_catalog } from '../../data/catalog'
import { applyFilters } from '../../domain/filters'
import type { Restaurant } from '../../domain/types'
import { cuisineIcon } from '../cuisineIcons'
import { emptyFilters } from '../components/filterTags'
import { use_spot_actions } from '../use_spot_actions'

const MAX_RESULTS = 20

export default function AddSpot() {
  const [all, setAll] = useState<Restaurant[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const { state_of, toggle_target, conquer } = use_spot_actions()

  useEffect(() => {
    get_catalog().then(setAll, (e: Error) => setError(e.message))
  }, [])

  const text = query.trim()
  const results = useMemo(
    () => (all && text ? applyFilters(all, { ...emptyFilters, query: text }, new Date()).slice(0, MAX_RESULTS) : []),
    [all, text],
  )

  if (error) return <p role="alert">{error}</p>

  return (
    <>
      <h1>Add a spot</h1>
      <Link className="import-link" to="/import">
        <FileUp size={18} aria-hidden="true" /> Import from Google Maps
      </Link>
      <div className="filterbar">
        <label className="search">
          <span className="visually-hidden">Search places</span>
          <input type="search" placeholder="Search places" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>

      {!text ? (
        <p className="empty">Search for a place by name, area or cuisine</p>
      ) : results.length === 0 ? (
        <p className="empty">No places match “{text}”.</p>
      ) : (
        <ul className="spot-list">
          {results.map((r) => {
            const state = state_of(r.id)
            return (
              <li key={r.id} className="card spot-row">
                <span className="card-icon" aria-hidden="true">
                  {cuisineIcon(r.cuisine)}
                </span>
                <div className="card-body">
                  <h3>{r.name}</h3>
                  <p className="card-meta">
                    {r.area} · {'$'.repeat(r.priceBand)}
                  </p>
                </div>
                {state ? (
                  <span className="added">{state === 'targeted' ? 'Added to Targets' : 'Added to Conquered'}</span>
                ) : (
                  <div className="spot-actions">
                    <button type="button" className="icon-btn" aria-label={`Add ${r.name} as a Target`} onClick={() => toggle_target(r)}>
                      <Crosshair size={20} />
                    </button>
                    <button type="button" className="icon-btn" aria-label={`Add ${r.name} as Conquered`} onClick={() => conquer(r)}>
                      <Flag size={20} />
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
