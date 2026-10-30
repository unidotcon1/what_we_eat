import { Heart, PlusCircle, MinusCircle, MapPin } from 'lucide-react'
import type { Restaurant } from '../../domain/types'
import { cuisineIcon } from '../cuisineIcons'

const TAG_LABEL: Record<string, string> = {
  group: 'Big groups',
  date: 'Date night',
  small: 'Small groups',
  quiet: 'Quiet',
  late: 'Open late',
  halal: 'Halal',
  vegetarian: 'Vegetarian',
}

export const tagLabel = (t: string) => TAG_LABEL[t] ?? t[0].toUpperCase() + t.slice(1)

type Props = {
  r: Restaurant
  saved: boolean
  inShortlist: boolean
  onSave(): void
  onToggleShortlist(): void
}

export function RestaurantCard({ r, saved, inShortlist, onSave, onToggleShortlist }: Props) {
  return (
    <article className="card">
      <span className="card-icon" aria-hidden="true">
        {cuisineIcon(r.cuisine)}
      </span>
      <div className="card-body">
        <h3>{r.name}</h3>
        <p className="card-meta">
          <MapPin size={11} aria-hidden="true" /> {r.area} · {'$'.repeat(r.priceBand)}
        </p>
        <div className="card-tags">
          {r.tags.map((t) => (
            <span key={t} className="tag">
              {tagLabel(t)}
            </span>
          ))}
        </div>
      </div>
      <div className="card-actions">
        <button
          type="button"
          aria-label={`${saved ? 'Unsave' : 'Save'} ${r.name}`}
          aria-pressed={saved}
          onClick={onSave}
        >
          <Heart size={18} fill={saved ? 'currentColor' : 'none'} />
        </button>
        <button
          type="button"
          aria-label={inShortlist ? `Remove ${r.name} from shortlist` : `Add ${r.name} to shortlist`}
          aria-pressed={inShortlist}
          onClick={onToggleShortlist}
        >
          {inShortlist ? <MinusCircle size={18} /> : <PlusCircle size={18} />}
        </button>
      </div>
    </article>
  )
}
