import { useEffect, useState } from 'react'
import type { Restaurant } from '../../domain/types'
import { fetchRestaurants } from '../../data/restaurants'
import { useSaves, useShortlist } from '../../local/store'
import { RestaurantCard } from '../components/RestaurantCard'

export default function Saved() {
  const [all, setAll] = useState<Restaurant[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { saved, toggle } = useSaves()
  const shortlist = useShortlist()

  useEffect(() => {
    fetchRestaurants().then(setAll, (e: Error) => setError(e.message))
  }, [])

  if (error) return <p role="alert">{error}</p>
  if (!all) return <p>Loading…</p>

  const mine = all.filter((r) => saved.has(r.id))
  return (
    <>
      <h1>Saved</h1>
      {mine.length === 0 ? (
        <p className="empty">Nothing saved yet</p>
      ) : (
        mine.map((r) => (
          <RestaurantCard
            key={r.id}
            r={r}
            saved
            inShortlist={shortlist.ids.includes(r.id)}
            onSave={() => toggle(r.id)}
            onToggleShortlist={() => shortlist.toggle(r.id)}
          />
        ))
      )}
    </>
  )
}
