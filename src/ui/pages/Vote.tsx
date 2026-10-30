import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Send } from 'lucide-react'
import { getPollApi, listMyPolls, rememberPoll } from '../../data/polls'
import { fetchRestaurants } from '../../data/restaurants'
import type { Restaurant } from '../../domain/types'
import { shareLinks } from '../../domain/poll'
import { getVoterToken, useShortlist } from '../../local/store'
import { cuisineIcon } from '../cuisineIcons'

type Sent = { code: string; title: string; names: string[]; url: string }

export default function Vote() {
  const [all, setAll] = useState<Restaurant[] | null>(null)
  const [title, setTitle] = useState('Where should we eat?')
  const [sent, setSent] = useState<Sent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [mine, setMine] = useState(listMyPolls())
  const shortlist = useShortlist()
  const api = useMemo(() => getPollApi(), [])

  useEffect(() => {
    fetchRestaurants().then(setAll, (e: Error) => setError(e.message))
  }, [])

  if (!all) return error ? <p role="alert">{error}</p> : <p>Loading…</p>

  const picked = shortlist.ids.map((id) => all.find((r) => r.id === id)).filter((r): r is Restaurant => !!r)

  async function send() {
    setBusy(true)
    setError(null)
    try {
      const code = await api.create(title.trim() || 'Where should we eat?', picked.map((r) => r.id), getVoterToken())
      const t = title.trim() || 'Where should we eat?'
      rememberPoll(code, t, 'created')
      setMine(listMyPolls())
      setSent({ code, title: t, names: picked.map((r) => r.name), url: `${window.location.origin}/p/${code}` })
      shortlist.clear()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const links = sent ? shareLinks(sent.title, sent.names, sent.url) : null

  return (
    <>
      <h1>Vote</h1>

      {sent && links && (
        <section className="sent" aria-label="Poll ready">
          <h2>Poll ready</h2>
          <p>Send it to your group chat. Friends vote with no login.</p>
          <div className="bar">
            <a className="fbtn" href={links.whatsapp} target="_blank" rel="noreferrer">
              <Send size={14} aria-hidden="true" /> WhatsApp
            </a>
            <a className="fbtn" href={links.telegram} target="_blank" rel="noreferrer">
              <Send size={14} aria-hidden="true" /> Telegram
            </a>
            <button type="button" className="chip" onClick={() => void navigator.clipboard?.writeText(sent.url)}>
              <Copy size={13} aria-hidden="true" /> Copy link
            </button>
          </div>
          <Link to={`/p/${sent.code}`}>Open the poll</Link>
        </section>
      )}

      <section aria-label="Draft shortlist">
        <h2>Your shortlist</h2>
        {picked.length === 0 ? (
          <p className="empty">Add places from Explore with the + button to start a shortlist.</p>
        ) : (
          <>
            <label className="field">
              Poll title
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            {picked.map((r) => (
              <div key={r.id} className="card">
                <span className="card-icon" aria-hidden="true">
                  {cuisineIcon(r.cuisine)}
                </span>
                <div className="card-body">
                  <h3>{r.name}</h3>
                  <p className="card-meta">
                    {r.area} · {'$'.repeat(r.priceBand)}
                  </p>
                </div>
                <button type="button" className="clear" aria-label={`Remove ${r.name}`} onClick={() => shortlist.toggle(r.id)}>
                  Remove
                </button>
              </div>
            ))}
            {picked.length < 2 && <p className="sub">Add at least two places to make a poll.</p>}
            <button type="button" className="apply" disabled={picked.length < 2 || busy} onClick={() => void send()}>
              Send to friends
            </button>
          </>
        )}
        {error && <p role="alert">{error}</p>}
      </section>

      {mine.length > 0 && (
        <section aria-label="My polls">
          <h2>My polls</h2>
          {mine.map((p) => (
            <Link key={p.code} className="card" to={`/p/${p.code}`}>
              <div className="card-body">
                <h3>{p.title}</h3>
                <p className="card-meta">{p.role === 'created' ? 'Created by you' : 'Joined'}</p>
              </div>
            </Link>
          ))}
        </section>
      )}
    </>
  )
}
