import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { accountsAvailable, delete_my_account, fetchMyStats, signInWithGoogle, signOut, useUser, type MyStats } from '../../data/auth'
import { levelFor } from '../../domain/points'
import { count_spots } from '../../domain/spots'
import { use_spots } from '../../local/spots_store'
import { currentTheme, setTheme, type Theme } from '../theme'

export default function Me() {
  const { user } = useUser()
  const [stats, setStats] = useState<MyStats | null>(null)
  const [theme, setThemeState] = useState<Theme>(currentTheme)
  const [error, setError] = useState<string | null>(null)
  const [confirming, set_confirming] = useState(false)
  const [deleting, set_deleting] = useState(false)
  const [deleted, set_deleted] = useState(false)

  useEffect(() => {
    if (user) fetchMyStats().then(setStats, (e: Error) => setError(e.message))
  }, [user])

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
    } catch (e) {
      setError((e as Error).message)
    } finally {
      set_deleting(false)
    }
  }

  const level = stats ? levelFor(stats.points) : null
  const counts = count_spots(use_spots())

  return (
    <>
      <h1>Profile</h1>

      {deleted && <p role="status">Your account has been deleted. Spots saved on this phone are still here.</p>}

      <div className="stats spot-counts">
        <div>
          <strong>{counts.targeted}</strong>
          <span>Targets</span>
        </div>
        <div>
          <strong>{counts.conquered}</strong>
          <span>Conquered</span>
        </div>
      </div>

      {!accountsAvailable() ? (
        <p className="sub">Accounts need the online database, which is not set up yet. Saving and voting still work.</p>
      ) : !user ? (
        <section>
          <p className="sub">Sign in to review restaurants and earn points.</p>
          <button type="button" className="apply" onClick={() => void signInWithGoogle().catch((e: Error) => setError(e.message))}>
            Sign in with Google
          </button>
        </section>
      ) : (
        <section aria-label="My progress">
          <p className="sub">{user.email}</p>
          {stats && level && (
            <>
              <p>
                Level {level.level} · {level.name}
              </p>
              <p>{level.nextAt === null ? `${stats.points} points` : `${stats.points} / ${level.nextAt} points`}</p>
              <div className="bar-track">
                <span
                  className="bar-fill"
                  style={{ width: `${level.nextAt === null ? 100 : Math.min(100, (stats.points / level.nextAt) * 100)}%` }}
                />
              </div>
              <div className="stats">
                <div>
                  <strong>{stats.reviews}</strong>
                  <span>Reviews</span>
                </div>
              </div>
              <p className="sub">+5 review · +5 first save · 30 points a day at most</p>
            </>
          )}
          <button type="button" className="chip" onClick={() => void signOut()}>
            Sign out
          </button>

          {!confirming ? (
            <button type="button" className="chip danger-link" onClick={() => set_confirming(true)}>
              Delete my account
            </button>
          ) : (
            <div role="alertdialog" aria-label="Confirm account deletion" className="confirm">
              <p>
                This permanently deletes your account, your Spots and your points from our servers. It cannot be undone. Spots saved on
                this phone stay on this phone.
              </p>
              <button type="button" className="apply danger" disabled={deleting} onClick={() => void run_delete()}>
                Yes, delete my account
              </button>
              <button type="button" className="chip" disabled={deleting} onClick={() => set_confirming(false)}>
                Cancel
              </button>
            </div>
          )}
        </section>
      )}

      <button type="button" className="chip themebtn" aria-pressed={theme === 'dark'} onClick={toggleTheme}>
        Dark mode: {theme === 'dark' ? 'on' : 'off'}
      </button>
      {error && <p role="alert">{error}</p>}
      <p className="sub legal-links">
        <Link to="/privacy">Privacy policy</Link> · <Link to="/terms">Terms of service</Link>
      </p>
    </>
  )
}
