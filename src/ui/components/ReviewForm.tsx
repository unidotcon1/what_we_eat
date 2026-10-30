import { useState } from 'react'
import { Star } from 'lucide-react'
import { useUser } from '../../data/auth'
import { submitReviewForCurrentClient } from '../../data/reviews'
import { MAX_REVIEW_CHARS, validateReview } from '../../domain/reviews'

export function ReviewForm({ restaurantId }: { restaurantId: string }) {
  const { user } = useUser()
  const [rating, setRating] = useState(0)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  if (!user) return <p className="sub">Sign in to write a review</p>
  if (done) return <p className="sub">Thanks! Your review is waiting for approval.</p>

  async function submit() {
    const invalid = validateReview(rating, body)
    if (invalid) return setError(invalid)
    setError(null)
    try {
      await submitReviewForCurrentClient(restaurantId, rating, body)
      setDone(true)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <div className="stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
            aria-pressed={rating === n}
            onClick={() => setRating(n)}
          >
            <Star size={22} fill={n <= rating ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
      <label className="field">
        Your review
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
      </label>
      <p className="sub">
        {body.trim().length} / {MAX_REVIEW_CHARS}
      </p>
      {error && <p role="alert">{error}</p>}
      <button type="submit" className="apply">
        Submit review
      </button>
    </form>
  )
}
