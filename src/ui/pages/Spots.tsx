import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Crosshair, Flag, Plus, Trash2, Undo2 } from 'lucide-react'
import { get_catalog } from '../../data/catalog'
import { count_spots, spots_in_state, type Spot, type SpotState } from '../../domain/spots'
import { cuisineIcon } from '../cuisineIcons'
import { use_spot_actions } from '../use_spot_actions'

const DAY = new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Singapore' })

export default function Spots() {
  const { spots, move, remove } = use_spot_actions()
  const [tab, setTab] = useState<SpotState>('targeted')
  const [cuisine_by_place, set_cuisine_by_place] = useState<Record<string, string>>({})

  useEffect(() => {
    get_catalog().then(
      (catalog) => set_cuisine_by_place(Object.fromEntries(catalog.map((r) => [r.id, r.cuisine]))),
      () => undefined, // icons fall back to a pin if the catalogue cannot load
    )
  }, [])

  const counts = count_spots(spots)
  const shown = spots_in_state(spots, tab)

  function icon_for(s: Spot) {
    return s.place_id && cuisine_by_place[s.place_id] ? cuisineIcon(cuisine_by_place[s.place_id]) : '📍'
  }

  return (
    <>
      <header className="page-head">
        <h1>Spots</h1>
        <Link className="head-action" to="/add" aria-label="Add a spot">
          <Plus size={16} aria-hidden="true" /> Add
        </Link>
      </header>
      <div className="segmented" role="tablist" aria-label="Spots">
        <button type="button" role="tab" aria-selected={tab === 'targeted'} onClick={() => setTab('targeted')}>
          <Crosshair size={15} aria-hidden="true" /> Targets <span className="count">{counts.targeted}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === 'conquered'} onClick={() => setTab('conquered')}>
          <Flag size={15} aria-hidden="true" /> Conquered <span className="count">{counts.conquered}</span>
        </button>
      </div>

      {shown.length === 0 ? (
        <p className="empty">
          {tab === 'targeted'
            ? 'No Targets yet. Tap the crosshair on a place to aim at it.'
            : "Nothing conquered yet. When you've been somewhere, conquer it from your Targets."}
        </p>
      ) : (
        <ul className="spot-list">
          {shown.map((s) => (
            <li key={s.id} className="card spot-row">
              <span className="card-icon" aria-hidden="true">
                {icon_for(s)}
              </span>
              <div className="card-body">
                <h3>{s.name}</h3>
                <p className="card-meta">
                  {s.address || 'Singapore'}
                  {s.state === 'conquered' && s.conquered_at ? ` · ${DAY.format(new Date(s.conquered_at))}` : ''}
                </p>
              </div>
              <div className="spot-actions">
                {s.state === 'targeted' ? (
                  <button type="button" className="conquer" aria-label={`Conquer ${s.name}`} onClick={() => move(s.id, 'conquered')}>
                    <Flag size={16} aria-hidden="true" /> Conquer
                  </button>
                ) : (
                  <button type="button" className="icon-btn" aria-label={`Move ${s.name} back to Targets`} onClick={() => move(s.id, 'targeted')}>
                    <Undo2 size={18} />
                  </button>
                )}
                <button type="button" className="icon-btn" aria-label={`Remove ${s.name}`} onClick={() => remove(s.id)}>
                  <Trash2 size={18} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
