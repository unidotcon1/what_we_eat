import { useState } from 'react'
import type { Restaurant } from '../../domain/types'
import { cuisineIcon } from '../cuisineIcons'

const TONES = 6

/** The same cuisine always lands on the same tone, so a row of posters looks planned, not random. */
function tone_for(cuisine: string): number {
  let hash = 0
  for (const ch of cuisine) hash = (hash * 31 + ch.charCodeAt(0)) % 997
  return hash % TONES
}

/**
 * The picture for a place: our own file when it has one, otherwise a drawn placeholder (plate rings and the cuisine emoji)
 * in palette tones. The name is always written next to the picture, so the picture itself is decorative.
 */
export function PosterArt({ r }: { r: Restaurant }) {
  const [broken, set_broken] = useState(false)
  if (r.image && !broken) {
    return <img className="poster-img" src={r.image} alt="" loading="lazy" onError={() => set_broken(true)} />
  }
  return (
    <div className={`poster-art art-${tone_for(r.cuisine)}`} aria-hidden="true">
      <span className="plate-ring ring-a" />
      <span className="plate-ring ring-b" />
      <span className="poster-emoji">{cuisineIcon(r.cuisine)}</span>
    </div>
  )
}
