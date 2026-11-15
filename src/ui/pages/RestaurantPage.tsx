import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Crosshair, Flag, Navigation, Star } from 'lucide-react'
import { fetchApprovedReviews, type ApprovedReview } from '../../data/reviews'
import { fetchRestaurants } from '../../data/restaurants'
import { google_maps_directions, type TravelMode } from '../../domain/directions'
import type { Restaurant } from '../../domain/types'
import { set_travel_mode, use_travel_mode } from '../../local/travel_mode'
import { MenuSection } from '../components/MenuSection'
import { PosterArt } from '../components/PosterArt'
import { ReviewForm } from '../components/ReviewForm'
import { tagLabel } from '../components/RestaurantCard'
import { use_spot_actions } from '../use_spot_actions'

const MODES: { value: TravelMode; label: string }[] = [
  { value: 'walking', label: 'Walk' },
  { value: 'transit', label: 'Transit' },
  { value: 'driving', label: 'Drive' },
]

export default function RestaurantPage() {
  const { id = '' } = useParams()
  const [restaurant, setRestaurant] = useState<Restaurant | null | undefined>(undefined)
  const [reviews, setReviews] = useState<ApprovedReview[] | null>(null)
  const mode = use_travel_mode()
  const { state_of, toggle_target, conquer } = use_spot_actions()

  useEffect(() => {
    fetchRestaurants().then((all) => setRestaurant(all.find((r) => r.id === id) ?? null), () => setRestaurant(null))
    fetchApprovedReviews(id).then(setReviews, () => setReviews([]))
  }, [id])

  if (restaurant === undefined) return <p>Loading…</p>
  if (restaurant === null) return <p>Restaurant not found</p>

  const state = state_of(restaurant.id)
  const directions = google_maps_directions(restaurant, mode)
  const target_label =
    state === 'targeted'
      ? `Remove ${restaurant.name} from Targets`
      : state === 'conquered'
        ? `Move ${restaurant.name} back to Targets`
        : `Target ${restaurant.name}`

  return (
    <>
      <Link className="back" to="/">
        ← Back to Explore
      </Link>
      <div className="detail-art">
        <PosterArt r={restaurant} />
      </div>
      <h1>{restaurant.name}</h1>
      <p className="sub">
        {restaurant.area} · {'$'.repeat(restaurant.priceBand)} · {restaurant.cuisine}
      </p>
      <div className="card-tags">
        {restaurant.tags.map((t) => (
          <span key={t} className="tag">
            {tagLabel(t)}
          </span>
        ))}
      </div>

      <div className="detail-actions">
        <button type="button" className={`quiet${state ? ' on' : ''}`} aria-label={target_label} aria-pressed={state === 'targeted'} onClick={() => toggle_target(restaurant)}>
          {state === 'conquered' ? <Flag size={18} aria-hidden="true" /> : <Crosshair size={18} aria-hidden="true" />}
          {state === 'conquered' ? 'Conquered' : state === 'targeted' ? 'Targeted' : 'Target'}
        </button>
        {state !== 'conquered' && (
          <button type="button" className="quiet" aria-label={`Conquer ${restaurant.name}`} onClick={() => conquer(restaurant)}>
            <Flag size={18} aria-hidden="true" /> Conquer
          </button>
        )}
      </div>

      {directions && (
        <div className="directions">
          <a className="cta" href={directions} target="_blank" rel="noopener noreferrer">
            <Navigation size={18} aria-hidden="true" /> Directions
          </a>
          <div className="mini-seg" role="radiogroup" aria-label="How are you getting there?">
            {MODES.map((m) => (
              <button key={m.value} type="button" role="radio" aria-checked={mode === m.value} onClick={() => set_travel_mode(m.value)}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <MenuSection r={restaurant} />

      <h2>Reviews</h2>
      {reviews && reviews.length === 0 && <p className="sub">No reviews yet</p>}
      {reviews?.map((rv) => (
        <div key={rv.id} className="card">
          <div className="card-body">
            <p className="card-meta" aria-label={`${rv.rating} out of 5`}>
              {Array.from({ length: rv.rating }, (_, i) => (
                <Star key={i} size={12} fill="currentColor" aria-hidden="true" />
              ))}
            </p>
            <p>{rv.body}</p>
          </div>
        </div>
      ))}

      <h2>Write a review</h2>
      <ReviewForm restaurantId={restaurant.id} />
    </>
  )
}
