import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPollApi, rememberPoll, type PollView } from '../../data/polls'
import { fetchRestaurants } from '../../data/restaurants'
import type { Restaurant } from '../../domain/types'
import { tally } from '../../domain/poll'
import { getVoterToken } from '../../local/store'
import { cuisineIcon } from '../cuisineIcons'

export default function PollPage() {
  const { code = '' } = useParams()
  const api = useMemo(() => getPollApi(), [])
  const token = useMemo(() => getVoterToken(), [])
  const [poll, setPoll] = useState<PollView | null | undefined>(undefined)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [mine, setMine] = useState<string | null>(null)
  const [creator, setCreator] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const [view, vote] = await Promise.all([api.get(code), api.myVote(code, token)])
    setPoll(view)
    setMine(vote)
  }, [api, code, token])

  useEffect(() => {
    fetchRestaurants().then(setRestaurants, () => undefined)
    refresh().catch((e: Error) => setError(e.message))
    api.isCreator(code, token).then(setCreator, () => undefined)
    return api.subscribe(code, () => void refresh().catch(() => undefined))
  }, [api, code, token, refresh])

  if (error) return <p role="alert">{error}</p>
  if (poll === undefined) return <p>Loading…</p>
  if (poll === null) return <p>Poll not found</p>

  const byId = new Map(restaurants.map((r) => [r.id, r]))
  const optionIds = poll.options.map((o) => o.id)
  const { counts, leaders } = tally(poll.votes, optionIds)
  const total = poll.votes.length
  const nameOf = (optionId: string) => byId.get(poll.options.find((o) => o.id === optionId)!.restaurantId)?.name ?? 'Restaurant'

  async function cast(optionId: string) {
    if (!poll || poll.closed) return
    try {
      await api.vote(code, optionId, token)
      rememberPoll(code, poll.title, 'joined')
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <main className="app pollpage">
      <h1>{poll.title}</h1>
      <p className="sub">
        {poll.closed ? 'Voting closed' : 'Tap a place to vote. You can change your vote until voting closes.'}
      </p>
      {poll.options.map((o) => {
        const r = byId.get(o.restaurantId)
        const n = counts[o.id] ?? 0
        return (
          <button
            key={o.id}
            type="button"
            className="option"
            aria-pressed={mine === o.id}
            disabled={poll.closed}
            onClick={() => void cast(o.id)}
          >
            <span className="card-icon" aria-hidden="true">
              {cuisineIcon(r?.cuisine ?? '')}
            </span>
            <span className="option-main">
              <strong>{r?.name ?? 'Restaurant'}</strong>
              <span className="option-sub">{r ? `${r.area} · ${'$'.repeat(r.priceBand)}` : ''}</span>
              <span className="bar-track">
                <span className="bar-fill" style={{ width: total ? `${(n / total) * 100}%` : '0%' }} />
              </span>
            </span>
            <span className="votes">{`${n} vote${n === 1 ? '' : 's'}`}</span>
          </button>
        )
      })}
      {leaders.length > 1 && <p className="result">{`It's a tie between ${leaders.map(nameOf).join(' and ')}`}</p>}
      {leaders.length === 1 && (
        <p className="result">{`${poll.closed ? 'Winner' : 'Leading'}: ${nameOf(leaders[0])}`}</p>
      )}
      {creator && !poll.closed && (
        <button
          type="button"
          className="apply"
          onClick={() => void api.close(code, token).then(refresh, (e: Error) => setError(e.message))}
        >
          Close voting
        </button>
      )}
    </main>
  )
}
