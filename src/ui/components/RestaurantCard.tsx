import { Link } from 'react-router-dom'
import { Check, Crosshair, Flag, MapPin } from 'lucide-react'
import type { SpotState } from '../../domain/spots'
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

const MAX_TAGS = 2

type Props = {
  r: Restaurant
  state: SpotState | undefined
  on_target(): void
  /** True while the person is picking places for a vote: the Target button gives way to a pick toggle. */
  picking: boolean
  picked: boolean
  on_pick(): void
}

export function RestaurantCard({ r, state, on_target, picking, picked, on_pick }: Props) {
  const target_label =
    state === 'targeted' ? `Remove ${r.name} from Targets` : state === 'conquered' ? `Move ${r.name} back to Targets` : `Target ${r.name}`

  return (
    <article className={`card${state ? ` is-${state}` : ''}`}>
      <span className="card-icon" aria-hidden="true">
        {cuisineIcon(r.cuisine)}
      </span>
      <div className="card-body">
        <h3>
          <Link to={`/r/${r.id}`}>{r.name}</Link>
        </h3>
        <p className="card-meta">
          <MapPin size={11} aria-hidden="true" /> {r.area} · {'$'.repeat(r.priceBand)}
          {state === 'conquered' && (
            <span className="conquered-badge">
              <Flag size={11} aria-hidden="true" />
              Conquered
            </span>
          )}
        </p>
        <div className="card-tags">
          {r.tags.slice(0, MAX_TAGS).map((t) => (
            <span key={t} className="tag">
              {tagLabel(t)}
            </span>
          ))}
        </div>
      </div>
      {picking ? (
        <button
          type="button"
          className={`pick${picked ? ' on' : ''}`}
          aria-label={picked ? `Remove ${r.name} from the vote` : `Pick ${r.name} for the vote`}
          aria-pressed={picked}
          onClick={on_pick}
        >
          <Check size={18} />
        </button>
      ) : (
        <button
          type="button"
          className={`target${state ? ` ${state}` : ''}`}
          aria-label={target_label}
          aria-pressed={state === 'targeted'}
          onClick={on_target}
        >
          {state === 'conquered' ? <Flag size={20} /> : <Crosshair size={22} />}
        </button>
      )}
    </article>
  )
}
