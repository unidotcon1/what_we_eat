import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, FileUp, LogOut, Moon } from 'lucide-react'
import { accountsAvailable, delete_my_account, fetchMyStats, signInWithGoogle, signOut, useUser, type MyStats } from '../../data/auth'
import { get_catalog } from '../../data/catalog'
import { levelFor } from '../../domain/points'
import { conquered_progress } from '../../domain/spots'
import { use_spots } from '../../local/spots_store'
import { ProgressRing } from '../components/ProgressRing'
import { currentTheme, setTheme, type Theme } from '../theme'

export default function Me() {
  const { user } = useUser()
  const spots = use_spots()
  const [stats, setStats] = useState<MyStats | null>(null)
  const [place_ids, set_place_ids] = useState<string[]>([])
  const [theme, setThemeState] = useState<Theme>(currentTheme)
  const [error, setError] = useState<string | null>(null)
  const [confirming, set_confirming] = useState(false)
  const [deleting, set_deleting] = useState(false)
  const [deleted, set_deleted] = useState(false)
  const [typed, set_typed] = useState('')

  useEffect(() => {
    if (user) fetchMyStats().then(setStats, (e: Error) => setError(e.message))
  }, [user])

  useEffect(() => {
    get_catalog().then(
      (catalog) => set_place_ids(catalog.map((r) => r.id)),
      () => undefined, // without the list there is no ring, and the rest of the page still works
    )
  }, [])

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    setThemeState(next)
  }

  async function run_delete() {
    set_deleting(true)
    setError(null)
    try {
      await delete_my_account()
      set_deleted(true)
      set_confirming(false)
      set_typed('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      set_deleting(false)
    }
  }

  const level = user && stats ? levelFor(stats.points) : null
  const progress = conquered_progress(spots, place_ids)

  return (
    <>
      <h1>Profile</h1>

      {deleted && <p role="status">Your account has been deleted. Spots saved on this phone are still here.</p>}

      {progress.total > 0 && (
        <section className="hero-card" aria-label="Progress">
          <ProgressRing value={progress.done} max={progress.total} label={`Conquered ${progress.done} of ${progress.total}`}>
            <b>{progress.done}</b>
          </ProgressRing>
          <h2>
            Conquered {progress.done} of {progress.total}
          </h2>
          {level && stats && (
            <>
              <span className="badge">
                <b>Lv {level.level}</b> <span>{level.name}</span>
              </span>
              <p>{level.nextAt === null ? `${stats.points} points` : `${level.nextAt - stats.points} points to ${level.next_name}`}</p>
            </>
          )}
        </section>
      )}

      {!accountsAvailable() ? (
        <p className="sub">Accounts need the online database, which is not set up yet. Saving and voting still work.</p>
      ) : (
        !user && (
          <section className="signin">
            <p className="sub">Sign in to earn points and keep your Spots on every phone.</p>
            <button type="button" className="cta" onClick={() => void signInWithGoogle().catch((e: Error) => setError(e.message))}>
              Sign in with Google
            </button>
          </section>
        )
      )}

      <ul className="menu-card" role="list" aria-label="Profile menu">
        <li>
          <Link className="row" to="/import">
            <FileUp size={20} aria-hidden="true" />
            <span className="grow">Import from Google Maps</span>
            <ChevronRight size={18} className="chev" aria-hidden="true" />
          </Link>
        </li>
        <li>
          <button type="button" className="row" role="switch" aria-checked={theme === 'dark'} onClick={toggleTheme}>
            <Moon size={20} aria-hidden="true" />
            <span className="grow">Dark mode</span>
            <span className="switch" aria-hidden="true" />
          </button>
        </li>
        {user && (
          <li>
            <button type="button" className="row" onClick={() => void signOut()}>
              <LogOut size={20} aria-hidden="true" />
              <span className="grow">Sign out</span>
            </button>
          </li>
        )}
      </ul>

      {user && (
        <section aria-label="My account">
          <p className="sub">Signed in as {user.email}</p>
          <p className="sub">Signing out clears the Spots on this phone. They stay in your account and come back when you sign in.</p>

          {!confirming ? (
            <button type="button" className="text-btn danger-link" onClick={() => set_confirming(true)}>
              Delete my account
            </button>
          ) : (
            <div role="alertdialog" aria-label="Confirm account deletion" className="confirm">
              <p>
                This permanently deletes your account, your Spots and your points from our servers. It cannot be undone. Spots saved on
                this phone stay on this phone.
              </p>
              <label>
                To confirm, type DELETE
                <input value={typed} onChange={(e) => set_typed(e.target.value)} autoComplete="off" autoCapitalize="characters" />
              </label>
              <button type="button" className="apply danger" disabled={deleting || typed !== 'DELETE'} onClick={() => void run_delete()}>
                Yes, delete my account
              </button>
              <button
                type="button"
                className="chip"
                disabled={deleting}
                onClick={() => {
                  set_confirming(false)
                  set_typed('')
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </section>
      )}

      {error && <p role="alert">{error}</p>}
      <p className="sub legal-links">
        <Link to="/privacy">Privacy policy</Link> · <Link to="/terms">Terms of service</Link>
      </p>
    </>
  )
}
