import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Star } from 'lucide-react'
import { fetchApprovedReviews, type ApprovedReview } from '../../data/reviews'
import { fetchRestaurants } from '../../data/restaurants'
import type { Restaurant } from '../../domain/types'
import { ReviewForm } from '../components/ReviewForm'
import { tagLabel } from '../components/RestaurantCard'
import { cuisineIcon } from '../cuisineIcons'

export default function RestaurantPage() {
  const { id = '' } = useParams()
  const [restaurant, setRestaurant] = useState<Restaurant | null | undefined>(undefined)
  const [reviews, setReviews] = useState<ApprovedReview[] | null>(null)

  useEffect(() => {
    fetchRestaurants().then((all) => setRestaurant(all.find((r) => r.id === id) ?? null), () => setRestaurant(null))
    fetchApprovedReviews(id).then(setReviews, () => setReviews([]))
  }, [id])

  if (restaurant === undefined) return <p>Loading…</p>
  if (restaurant === null) return <p>Restaurant not found</p>

  return (
    <>
      <Link to="/">← Back to Explore</Link>
      <h1>
        <span aria-hidden="true">{cuisineIcon(restaurant.cuisine)}</span> {restaurant.name}
      </h1>
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
      <a
        className="chip"
        href={`https://www.google.com/maps/dir/?api=1&destination=${restaurant.lat},${restaurant.lng}`}
        target="_blank"
        rel="noreferrer"
      >
        Directions
      </a>

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
