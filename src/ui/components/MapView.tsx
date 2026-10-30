import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Restaurant } from '../../domain/types'
import { cuisineIcon } from '../cuisineIcons'

const SINGAPORE: L.LatLngTuple = [1.3521, 103.8198]

function popupFor(r: Restaurant): HTMLElement {
  const box = document.createElement('div')
  const title = document.createElement('strong')
  title.textContent = r.name
  const meta = document.createElement('div')
  meta.textContent = `${r.area} · ${'$'.repeat(r.priceBand)}`
  const link = document.createElement('a')
  link.href = `https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}`
  link.target = '_blank'
  link.rel = 'noreferrer'
  link.textContent = 'Directions'
  box.append(title, meta, link)
  return box
}

export function MapView({ items }: { items: Restaurant[] }) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const pins = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!el.current) return
    const m = L.map(el.current).setView(SINGAPORE, 12)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(m)
    map.current = m
    pins.current = L.layerGroup().addTo(m)
    return () => {
      m.remove()
      map.current = null
      pins.current = null
    }
  }, [])

  useEffect(() => {
    const group = pins.current
    if (!group) return
    group.clearLayers()
    items.forEach((r) => {
      L.marker([r.lat, r.lng], {
        title: r.name,
        icon: L.divIcon({ className: 'pin', html: `<span>${cuisineIcon(r.cuisine)}</span>`, iconSize: [32, 32] }),
      })
        .bindPopup(popupFor(r))
        .addTo(group)
    })
  }, [items])

  return (
    <section aria-label="Map" className="map">
      <div ref={el} className="map-canvas" />
    </section>
  )
}
