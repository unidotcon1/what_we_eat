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

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}

/** The four filters people reach for most. Each one is a real filter, shown by its chip alone (no duplicate tag below). */
const QUICK = [
  { key: 'aud:date', label: 'Date night', is_on: (f: Filters) => f.audience.includes('date'), flip: (f: Filters): Filters => ({ ...f, audience: toggle(f.audience, 'date') }) },
  { key: 'aud:group', label: 'Big group', is_on: (f: Filters) => f.audience.includes('group'), flip: (f: Filters): Filters => ({ ...f, audience: toggle(f.audience, 'group') }) },
  { key: 'open', label: 'Open now', is_on: (f: Filters) => f.openNow, flip: (f: Filters): Filters => ({ ...f, openNow: !f.openNow }) },
  { key: 'diet:halal', label: 'Halal', is_on: (f: Filters) => f.dietary.includes('halal'), flip: (f: Filters): Filters => ({ ...f, dietary: toggle(f.dietary, 'halal') }) },
]
const QUICK_KEYS = new Set(QUICK.map((q) => q.key))

export function FilterBar({ filters, sort, onChange, onSort, onOpenSheet }: Props) {
  const tags = activeTags(filters)
  const other_tags = tags.filter((t) => !QUICK_KEYS.has(t.key))
  return (
    <div className="filterbar">
      <label className="search">
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          placeholder="Search restaurant, cuisine, area…"
          value={filters.query}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
        />
      </label>
      <div className="chips-row" role="group" aria-label="Quick filters">
        {QUICK.map((q) => (
          <button key={q.key} type="button" className={`chip${q.is_on(filters) ? ' on' : ''}`} aria-pressed={q.is_on(filters)} onClick={() => onChange(q.flip(filters))}>
            {q.label}
          </button>
        ))}
        <button type="button" className="chip" onClick={onOpenSheet}>
          <SlidersHorizontal size={16} aria-hidden="true" />
          {other_tags.length ? `Filters (${other_tags.length})` : 'Filters'}
        </button>
      </div>
      {other_tags.length > 0 && (
        <div className="bar">
          {other_tags.map((t) => (
            <button key={t.key} type="button" className="chip on" aria-label={`Remove filter ${t.label}`} onClick={() => onChange(removeTag(filters, t.key))}>
              {t.label} <X size={14} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
      <div className="sort-row">
        <button type="button" className="text-btn" onClick={() => onSort(sort === 'nearest' ? 'price' : 'nearest')}>
          <ArrowUpDown size={15} aria-hidden="true" /> Sort: {sort === 'nearest' ? 'nearest first' : 'cheapest first'}
        </button>
        {tags.length > 0 && (
          <button type="button" className="text-btn" onClick={() => onChange({ ...emptyFilters, query: filters.query })}>
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
