import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { Check, Crosshair, Flag, MapPin, Trash2 } from 'lucide-react'
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
const HOLD_MS = 500
const MOVE_PX = 10

export type CardChoice = SpotState | 'none'

type Props = {
  r: Restaurant
  state: SpotState | undefined
  /** A quick tap on the crosshair: adds or removes a Target. */
  on_target(): void
  /** A pick from the press-and-hold menu. */
  on_choose(choice: CardChoice): void
  /** True while the person is picking places for a vote: the Target button gives way to a pick toggle. */
  picking: boolean
  picked: boolean
  on_pick(): void
}

export function RestaurantCard({ r, state, on_target, on_choose, picking, picked, on_pick }: Props) {
  const [menu_open, set_menu_open] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const held = useRef(false)
  const start = useRef<{ x: number; y: number } | null>(null)
  const menu_ref = useRef<HTMLDivElement>(null)

  const target_label =
    state === 'targeted' ? `Remove ${r.name} from Targets` : state === 'conquered' ? `Move ${r.name} back to Targets` : `Target ${r.name}`

  function clear_timer() {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }

  useEffect(() => clear_timer, [])

  // close on a tap anywhere outside the menu; put focus on the first choice so the keyboard works
  useEffect(() => {
    if (!menu_open) return
    menu_ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true })
    function outside(e: Event) {
      if (menu_ref.current && !menu_ref.current.contains(e.target as Node)) set_menu_open(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [menu_open])

  function on_pointer_down(e: ReactPointerEvent) {
    if (e.button) return // only the main button or a finger starts a hold
    held.current = false
    start.current = { x: e.clientX, y: e.clientY }
    clear_timer()
    timer.current = setTimeout(() => {
      held.current = true
      set_menu_open(true)
      navigator.vibrate?.(12)
    }, HOLD_MS)
  }

  function on_pointer_move(e: ReactPointerEvent) {
    if (!timer.current || !start.current) return
    if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > MOVE_PX) clear_timer() // scrolling, not holding
  }

  function choose(choice: CardChoice) {
    set_menu_open(false)
    on_choose(choice)
  }

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
          aria-description="Tap to target. Press and hold for more choices."
          title="Tap to target. Press and hold for more choices."
          aria-pressed={state === 'targeted'}
          aria-haspopup="menu"
          aria-expanded={menu_open}
          onPointerDown={on_pointer_down}
          onPointerMove={on_pointer_move}
          onPointerUp={clear_timer}
          onPointerCancel={clear_timer}
          onPointerLeave={clear_timer}
          onContextMenu={(e) => {
            e.preventDefault() // a long press on Android and a right-click both land here
            clear_timer()
            set_menu_open(true)
          }}
          onClick={() => {
            if (held.current) {
              held.current = false // this click is just the end of the hold
              return
            }
            on_target()
          }}
        >
          {state === 'conquered' ? <Flag size={20} /> : <Crosshair size={22} />}
        </button>
      )}

      {menu_open && !picking && (
        <div
          ref={menu_ref}
          role="menu"
          aria-label={`Choose for ${r.name}`}
          className="hold-menu"
          onKeyDown={(e) => {
            if (e.key === 'Escape') set_menu_open(false)
          }}
        >
          <button
            type="button"
            role="menuitem"
            aria-label={`Make ${r.name} a Target`}
            aria-current={state === 'targeted' ? 'true' : undefined}
            onClick={() => choose('targeted')}
          >
            <Crosshair size={16} aria-hidden="true" /> Target
          </button>
          <button
            type="button"
            role="menuitem"
            aria-label={`Conquer ${r.name}`}
            aria-current={state === 'conquered' ? 'true' : undefined}
            onClick={() => choose('conquered')}
          >
            <Flag size={16} aria-hidden="true" /> Conquer
          </button>
          {state && (
            <button type="button" role="menuitem" aria-label={`Remove ${r.name} from my Spots`} onClick={() => choose('none')}>
              <Trash2 size={16} aria-hidden="true" /> Remove
            </button>
          )}
        </div>
      )}
    </article>
  )
}
