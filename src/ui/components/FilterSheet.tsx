import { X } from 'lucide-react'
import type { Audience, Filters, PriceBand } from '../../domain/types'
import { cuisineIcon } from '../cuisineIcons'

type Props = {
  filters: Filters
  areas: string[]
  cuisines: string[]
  count: number
  onChange(f: Filters): void
  onClose(): void
}

const BANDS: PriceBand[] = [1, 2, 3, 4]
const AUDIENCES: { value: Audience; label: string }[] = [
  { value: 'group', label: 'Big group 6+' },
  { value: 'date', label: 'Date night' },
  { value: 'small', label: 'Solo / small' },
]
const DIETARY = ['halal', 'vegetarian']

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}

export function FilterSheet({ filters: f, areas, cuisines, count, onChange, onClose }: Props) {
  return (
    <div className="sheet" role="dialog" aria-label="Filters">
      <header>
        <h2>Filters</h2>
        <button type="button" aria-label="Close filters" onClick={onClose}>
          <X size={18} />
        </button>
      </header>

      <h4>Price per person</h4>
      <div className="seg">
        {BANDS.map((b) => (
          <button
            key={b}
            type="button"
            className={f.bands.includes(b) ? 'on' : ''}
            aria-pressed={f.bands.includes(b)}
            onClick={() => onChange({ ...f, bands: toggle(f.bands, b) })}
          >
            {'$'.repeat(b)}
          </button>
        ))}
      </div>

      <h4>Location</h4>
      <div className="chips">
        {areas.map((a) => (
          <button
            key={a}
            type="button"
            className={f.area === a ? 'chip on' : 'chip'}
            aria-pressed={f.area === a}
            onClick={() => onChange({ ...f, area: f.area === a ? undefined : a })}
          >
            {a}
          </button>
        ))}
      </div>

      <h4>Who's eating</h4>
      <div className="chips">
        {AUDIENCES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={f.audience.includes(value) ? 'chip on' : 'chip'}
            aria-pressed={f.audience.includes(value)}
            onClick={() => onChange({ ...f, audience: toggle(f.audience, value) })}
          >
            {label}
          </button>
        ))}
      </div>

      <h4>Cuisine</h4>
      <div className="chips">
        {cuisines.map((c) => (
          <button
            key={c}
            type="button"
            className={f.cuisines.includes(c) ? 'chip on' : 'chip'}
            aria-pressed={f.cuisines.includes(c)}
            onClick={() => onChange({ ...f, cuisines: toggle(f.cuisines, c) })}
          >
            {cuisineIcon(c)} {c}
          </button>
        ))}
      </div>

      <h4>Dietary &amp; hours</h4>
      <div className="chips">
        {DIETARY.map((d) => (
          <button
            key={d}
            type="button"
            className={f.dietary.includes(d) ? 'chip on' : 'chip'}
            aria-pressed={f.dietary.includes(d)}
            onClick={() => onChange({ ...f, dietary: toggle(f.dietary, d) })}
          >
            {d[0].toUpperCase() + d.slice(1)}
          </button>
        ))}
        <button
          type="button"
          className={f.openNow ? 'chip on' : 'chip'}
          aria-pressed={f.openNow}
          onClick={() => onChange({ ...f, openNow: !f.openNow })}
        >
          Open now
        </button>
      </div>

      <button type="button" className="apply" onClick={onClose}>
        Show {count} places
      </button>
    </div>
  )
}
