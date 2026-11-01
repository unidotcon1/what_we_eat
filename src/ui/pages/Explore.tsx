import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Vote, X } from 'lucide-react'
import { applyFilters, sortRestaurants } from '../../domain/filters'
import type { Filters, Restaurant } from '../../domain/types'
import { get_catalog } from '../../data/catalog'
import { useShortlist } from '../../local/store'
import { FilterBar } from '../components/FilterBar'
import { FilterSheet } from '../components/FilterSheet'
import { RestaurantCard } from '../components/RestaurantCard'
import { emptyFilters } from '../components/filterTags'
import { use_spot_actions } from '../use_spot_actions'
import { useLocation } from '../useLocation'

export default function Explore() {
  const [all, setAll] = useState<Restaurant[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [sort, setSort] = useState<'nearest' | 'price'>('nearest')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [picking, setPicking] = useState(false)
  const location = useLocation()
  const { state_of, toggle_target } = use_spot_actions()
  const shortlist = useShortlist()

  useEffect(() => {
    get_catalog().then(setAll, (e: Error) => setError(e.message))
  }, [])

  // the device position lives outside the filters, so Clear never drops it
  const origin = location.coords
  const results = useMemo(
    () => (all ? sortRestaurants(applyFilters(all, { ...filters, origin }, new Date()), sort, origin) : []),
    [all, filters, sort, origin],
  )
  const areas = useMemo(() => [...new Set((all ?? []).map((r) => r.area))].sort(), [all])
  const cuisines = useMemo(() => [...new Set((all ?? []).map((r) => r.cuisine))].sort(), [all])

  if (error) return <p role="alert">{error}</p>
  if (!all) return <p>Loading…</p>

  function cancel_vote() {
    shortlist.clear()
    setPicking(false)
  }

  const picked_count = shortlist.ids.length

  return (
    <>
      <header className="page-head">
        <h1>What We Eat</h1>
        {picking ? (
          <button type="button" className="head-action" onClick={cancel_vote}>
            <X size={16} aria-hidden="true" /> Cancel vote
          </button>
        ) : (
          <button type="button" className="head-action" onClick={() => setPicking(true)}>
            <Vote size={16} aria-hidden="true" /> Start a vote
          </button>
        )}
      </header>
      <FilterBar
        filters={filters}
        sort={sort}
        onChange={setFilters}
        onSort={setSort}
        onOpenSheet={() => setSheetOpen(true)}
      />
      {results.length === 0 ? (
        <div className="empty">
          <p>No places match</p>
          <button type="button" className="clear" onClick={() => setFilters(emptyFilters)}>
            Clear
          </button>
        </div>
      ) : (
        results.map((r) => (
          <RestaurantCard
            key={r.id}
            r={r}
            state={state_of(r.id)}
            on_target={() => toggle_target(r)}
            picking={picking}
            picked={shortlist.ids.includes(r.id)}
            on_pick={() => shortlist.toggle(r.id)}
          />
        ))
      )}
      {picking && (
        <div className="vote-bar" role="status">
          {picked_count >= 2 ? (
            <Link className="apply" to="/vote">
              Send {picked_count} to friends
            </Link>
          ) : (
            <span>Pick at least 2 places</span>
          )}
        </div>
      )}
      {sheetOpen && (
        <FilterSheet
          filters={filters}
          areas={areas}
          cuisines={cuisines}
          count={results.length}
          location={{ status: location.status, onRequest: location.request }}
          onChange={setFilters}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  )
}
