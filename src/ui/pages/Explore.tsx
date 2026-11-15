import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Vote, X } from 'lucide-react'
import { applyFilters, sortRestaurants } from '../../domain/filters'
import type { Filters, Restaurant } from '../../domain/types'
import { get_catalog } from '../../data/catalog'
import { use_explore_view } from '../../local/explore_view'
import { useShortlist } from '../../local/store'
import { FilterBar } from '../components/FilterBar'
import { ExploreSkeleton } from '../components/ExploreSkeleton'
import { FilterSheet } from '../components/FilterSheet'
import { PosterCard } from '../components/PosterCard'
import { RestaurantCard } from '../components/RestaurantCard'
import { Shelf } from '../components/Shelf'
import { activeTags, emptyFilters } from '../components/filterTags'
import { use_spot_actions } from '../use_spot_actions'
import { useLocation } from '../useLocation'

/** The rows of the image layout. Each one is a real filter, so "View more" can switch that filter on. */
const SHELF_SPECS: { key: string; title: string; patch: Partial<Filters> }[] = [
  { key: 'date', title: 'Date night', patch: { audience: ['date'] } },
  { key: 'group', title: 'Big groups', patch: { audience: ['group'] } },
  { key: 'open', title: 'Open now', patch: { openNow: true } },
  { key: 'halal', title: 'Halal', patch: { dietary: ['halal'] } },
]
const MIN_SHELF = 3 // a row with fewer posters looks empty
const MAX_ROWS = 5
const ROW_LIMIT = 10

export default function Explore() {
  const [all, setAll] = useState<Restaurant[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [sort, setSort] = useState<'nearest' | 'price'>('nearest')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [picking, setPicking] = useState(false)
  const [show_all, set_show_all] = useState(false)
  const location = useLocation()
  const view = use_explore_view()
  const { state_of, toggle_target, set_state, remove_place } = use_spot_actions()
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

  const filtering = activeTags(filters).length > 0 || filters.query.trim() !== ''
  const shelves = useMemo(() => {
    if (!all || view !== 'images' || filtering || show_all) return []
    const now = new Date()
    const rows = [{ key: 'near', title: sort === 'nearest' ? 'Near you' : 'Cheapest', items: results.slice(1, 1 + ROW_LIMIT), patch: null as Partial<Filters> | null }]
    for (const spec of SHELF_SPECS) {
      const items = sortRestaurants(applyFilters(all, { ...emptyFilters, origin, ...spec.patch }, now), sort, origin).slice(0, ROW_LIMIT)
      rows.push({ key: spec.key, title: spec.title, items, patch: spec.patch })
    }
    return rows.filter((row) => row.items.length >= MIN_SHELF).slice(0, MAX_ROWS)
  }, [all, view, filtering, show_all, results, sort, origin])

  if (error) return <p role="alert">{error}</p>
  if (!all) {
    return (
      <>
        <header className="page-head">
          <h1>What We Eat</h1>
        </header>
        <ExploreSkeleton variant={view} />
      </>
    )
  }

  function cancel_vote() {
    shortlist.clear()
    setPicking(false)
  }

  const picked_count = shortlist.ids.length

  const poster = (r: Restaurant, variant: 'poster' | 'hero' = 'poster') => (
    <PosterCard
      key={r.id}
      r={r}
      variant={variant}
      state={state_of(r.id)}
      on_target={() => toggle_target(r)}
      picking={picking}
      picked={shortlist.ids.includes(r.id)}
      on_pick={() => shortlist.toggle(r.id)}
    />
  )

  return (
    <>
      <header className="page-head">
        <h1>What We Eat</h1>
        {picking ? (
          <button type="button" className="quiet" onClick={cancel_vote}>
            <X size={16} aria-hidden="true" /> Cancel vote
          </button>
        ) : (
          <button type="button" className="cta" onClick={() => setPicking(true)}>
            <Vote size={16} aria-hidden="true" /> Start a vote
          </button>
        )}
      </header>
      <FilterBar
        filters={filters}
        sort={sort}
        onChange={(next) => {
          set_show_all(false)
          setFilters(next)
        }}
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
      ) : view === 'images' ? (
        <>
          {poster(results[0], 'hero')}
          {show_all && !filtering && (
            <button type="button" className="text-btn" onClick={() => set_show_all(false)}>
              ← Back to rows
            </button>
          )}
          {filtering || show_all ? (
            <div className="poster-grid">{results.slice(1).map((r) => poster(r))}</div>
          ) : (
            shelves.map((row) => (
              <Shelf
                key={row.key}
                title={row.title}
                on_more={() => (row.patch ? setFilters({ ...filters, ...row.patch }) : set_show_all(true))}
              >
                {row.items.map((r) => poster(r))}
              </Shelf>
            ))
          )}
        </>
      ) : (
        results.map((r, i) => (
          <RestaurantCard
            key={r.id}
            r={r}
            variant={i === 0 ? 'hero' : 'row'}
            state={state_of(r.id)}
            on_target={() => toggle_target(r)}
            on_choose={(choice) => (choice === 'none' ? remove_place(r) : set_state(r, choice))}
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
