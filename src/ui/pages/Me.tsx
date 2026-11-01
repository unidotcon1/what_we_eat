import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { accountsAvailable, fetchMyStats, signInWithGoogle, signOut, useUser, type MyStats } from '../../data/auth'
import { levelFor } from '../../domain/points'
import { currentTheme, setTheme, type Theme } from '../theme'

export default function Me() {
  const { user } = useUser()
  const [stats, setStats] = useState<MyStats | null>(null)
  const [theme, setThemeState] = useState<Theme>(currentTheme)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) fetchMyStats().then(setStats, (e: Error) => setError(e.message))
  }, [user])

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    setThemeState(next)
  }

  const level = stats ? levelFor(stats.points) : null

  return (
    <>
      <h1>Me</h1>

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
                  <strong>{stats.saves}</strong>
                  <span>Saved places</span>
                </div>
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
