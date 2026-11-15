import { Link } from 'react-router-dom'
import { Check, Crosshair, Flag } from 'lucide-react'
import type { SpotState } from '../../domain/spots'
import type { Restaurant } from '../../domain/types'
import { PosterArt } from './PosterArt'

type Props = {
  r: Restaurant
  variant?: 'poster' | 'hero'
  state: SpotState | undefined
  on_target(): void
  /** True while the person is picking places for a vote: the Target button gives way to a pick toggle. */
  picking: boolean
  picked: boolean
  on_pick(): void
}

/** Every poster is the same shape: the picture, one line with the name, one small button. Nothing else sits on the picture. */
export function PosterCard({ r, variant = 'poster', state, on_target, picking, picked, on_pick }: Props) {
  const target_label =
    state === 'targeted' ? `Remove ${r.name} from Targets` : state === 'conquered' ? `Move ${r.name} back to Targets` : `Target ${r.name}`
  return (
    <article className={`poster${variant === 'hero' ? ' poster-hero' : ''}${state ? ` is-${state}` : ''}`}>
      <Link className="poster-link" to={`/r/${r.id}`}>
        <span className="poster-frame">
          <PosterArt r={r} />
        </span>
        <span className="poster-name">{r.name}</span>
      </Link>
      {picking ? (
        <button type="button" className={`pick${picked ? ' on' : ''}`} aria-label={picked ? `Remove ${r.name} from the vote` : `Pick ${r.name} for the vote`} aria-pressed={picked} onClick={on_pick}>
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
