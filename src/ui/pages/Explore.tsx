import { useEffect, useMemo, useState } from 'react'
import { applyFilters, sortRestaurants } from '../../domain/filters'
import type { Filters, Restaurant } from '../../domain/types'
import { fetchRestaurants } from '../../data/restaurants'
import { useSaves, useShortlist } from '../../local/store'
import { FilterBar } from '../components/FilterBar'
import { FilterSheet } from '../components/FilterSheet'
import { RestaurantCard } from '../components/RestaurantCard'
import { SuggestLink } from '../components/SuggestLink'
import { emptyFilters } from '../components/filterTags'

export default function Explore() {
  const [all, setAll] = useState<Restaurant[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [sort, setSort] = useState<'nearest' | 'price'>('nearest')
  const [sheetOpen, setSheetOpen] = useState(false)
  const { saved, toggle: toggleSave } = useSaves()
  const shortlist = useShortlist()

  useEffect(() => {
    fetchRestaurants().then(setAll, (e: Error) => setError(e.message))
  }, [])

  const results = useMemo(
    () => (all ? sortRestaurants(applyFilters(all, filters, new Date()), sort, filters.origin) : []),
    [all, filters, sort],
  )
  const areas = useMemo(() => [...new Set((all ?? []).map((r) => r.area))].sort(), [all])
  const cuisines = useMemo(() => [...new Set((all ?? []).map((r) => r.cuisine))].sort(), [all])

  if (error) return <p role="alert">{error}</p>
  if (!all) return <p>Loading…</p>

  return (
    <>
      <h1>What We Eat</h1>
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
            saved={saved.has(r.id)}
            inShortlist={shortlist.ids.includes(r.id)}
            onSave={() => toggleSave(r.id)}
            onToggleShortlist={() => shortlist.toggle(r.id)}
          />
        ))
      )}
      <SuggestLink url={import.meta.env.VITE_SUGGEST_FORM_URL as string | undefined} />
      {sheetOpen && (
        <FilterSheet
          filters={filters}
          areas={areas}
          cuisines={cuisines}
          count={results.length}
          onChange={setFilters}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  )
}
