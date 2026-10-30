import { ArrowUpDown, Search, SlidersHorizontal, X } from 'lucide-react'
import type { Filters } from '../../domain/types'
import { activeTags, emptyFilters, removeTag } from './filterTags'

type Props = {
  filters: Filters
  sort: 'nearest' | 'price'
  onChange(f: Filters): void
  onSort(s: 'nearest' | 'price'): void
  onOpenSheet(): void
}

export function FilterBar({ filters, sort, onChange, onSort, onOpenSheet }: Props) {
  const tags = activeTags(filters)
  return (
    <div className="filterbar">
      <label className="search">
        <Search size={15} aria-hidden="true" />
        <input
          type="search"
          placeholder="Search restaurant, cuisine, area…"
          value={filters.query}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
        />
      </label>
      <div className="bar">
        <button type="button" className="fbtn" onClick={onOpenSheet}>
          <SlidersHorizontal size={14} aria-hidden="true" />
          {tags.length ? `Filters (${tags.length})` : 'Filters'}
        </button>
        <button
          type="button"
          className="chip"
          onClick={() => onSort(sort === 'nearest' ? 'price' : 'nearest')}
        >
          <ArrowUpDown size={13} aria-hidden="true" /> {sort === 'nearest' ? 'Nearest' : 'Price'}
        </button>
      </div>
      {tags.length > 0 && (
        <div className="bar">
          {tags.map((t) => (
            <button
              key={t.key}
              type="button"
              className="chip on"
              aria-label={`Remove filter ${t.label}`}
              onClick={() => onChange(removeTag(filters, t.key))}
            >
              {t.label} <X size={12} aria-hidden="true" />
            </button>
          ))}
          <button type="button" className="clear" onClick={() => onChange({ ...emptyFilters, query: filters.query })}>
            Clear
          </button>
        </div>
      )}
    </div>
  )
}
