import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Compass, Crosshair, Flag, Plus, Trash2, Undo2 } from 'lucide-react'
import { get_catalog } from '../../data/catalog'
import { conquered_progress, count_spots, spots_in_state, type Spot, type SpotState } from '../../domain/spots'
import { EmptyArt } from '../components/EmptyArt'
import { ProgressRing } from '../components/ProgressRing'
import { cuisineIcon } from '../cuisineIcons'
import { use_sync_problem } from '../../local/sync_status'
import { use_spot_actions } from '../use_spot_actions'

const DAY = new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Singapore' })

export default function Spots() {
  const { spots, move, remove } = use_spot_actions()
  const sync_problem = use_sync_problem()
  const [tab, setTab] = useState<SpotState>('targeted')
  const [cuisine_by_place, set_cuisine_by_place] = useState<Record<string, string>>({})
  const [place_ids, set_place_ids] = useState<string[]>([])

  useEffect(() => {
    get_catalog().then(
      (catalog) => {
        set_cuisine_by_place(Object.fromEntries(catalog.map((r) => [r.id, r.cuisine])))
        set_place_ids(catalog.map((r) => r.id))
      },
      () => undefined, // icons fall back to a pin if the catalogue cannot load
    )
  }, [])

  const counts = count_spots(spots)
  const shown = spots_in_state(spots, tab)
  const progress = conquered_progress(spots, place_ids)
  const next_up = spots_in_state(spots, 'targeted')[0]

  function icon_for(s: Spot) {
    return s.place_id && cuisine_by_place[s.place_id] ? cuisineIcon(cuisine_by_place[s.place_id]) : '📍'
  }

  return (
    <>
      <header className="page-head">
        <h1>Spots</h1>
        <Link className="cta" to="/add" aria-label="Add a spot">
          <Plus size={16} aria-hidden="true" /> Add
        </Link>
      </header>
      {sync_problem && (
        <p role="status" className="sub">
          {sync_problem}
        </p>
      )}
      {progress.total > 0 && (
        <section className="progress-card" aria-label="Progress">
          <ProgressRing value={progress.done} max={progress.total} label={`Conquered ${progress.done} of ${progress.total}`}>
            <b>{progress.done}</b>
            <small>of {progress.total}</small>
          </ProgressRing>
          <div>
            <h2>
              Conquered {progress.done} of {progress.total}
            </h2>
            <p>{progress.total - progress.done} to go.</p>
            {next_up && <p>Next up: {next_up.name}</p>}
          </div>
        </section>
      )}
      <div className="segmented" role="tablist" aria-label="Spots">
        <button type="button" role="tab" aria-selected={tab === 'targeted'} onClick={() => setTab('targeted')}>
          <Crosshair size={15} aria-hidden="true" /> Targets <span className="count">{counts.targeted}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === 'conquered'} onClick={() => setTab('conquered')}>
          <Flag size={15} aria-hidden="true" /> Conquered <span className="count">{counts.conquered}</span>
        </button>
      </div>

      {shown.length === 0 ? (
        <div className="empty">
          <EmptyArt />
          <h3>{tab === 'targeted' ? 'No Targets yet' : 'Nothing conquered yet'}</h3>
          <p>
            {tab === 'targeted'
              ? 'Tap the crosshair on a place to aim at it. It will wait for you here.'
              : "When you've been somewhere, conquer it from your Targets."}
          </p>
          <Link className="quiet" to="/">
            <Compass size={18} aria-hidden="true" /> Explore places
          </Link>
        </div>
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
