import type { Day, Filters, LatLng, Restaurant } from './types'

const AUDIENCE_TAG = { group: 'group', date: 'date', small: 'small' } as const
const DAYS: Day[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Day of week and minutes since midnight in Singapore time. */
function singaporeClock(now: Date): { day: Day; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Singapore',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)!.value
  const day = get('weekday').toLowerCase().slice(0, 3) as Day
  return { day, minutes: Number(get('hour')) * 60 + Number(get('minute')) }
}

function isOpenNow(r: Restaurant, now: Date): boolean {
  if (!r.hours) return false
  const { day, minutes } = singaporeClock(now)
  const prev = DAYS[(DAYS.indexOf(day) + 6) % 7]
  const today = r.hours[day].some(([s, e]) => {
    const start = toMinutes(s)
    const end = toMinutes(e)
    return end > start ? minutes >= start && minutes < end : minutes >= start
  })
  const spill = r.hours[prev].some(([s, e]) => {
    const start = toMinutes(s)
    const end = toMinutes(e)
    return end <= start && minutes < end
  })
  return today || spill
}

export function applyFilters(list: Restaurant[], f: Filters, now: Date): Restaurant[] {
  const q = f.query.trim().toLowerCase()
  return list.filter((r) => {
    if (r.closed) return false
    if (q && ![r.name, r.area, r.cuisine].some((s) => s.toLowerCase().includes(q))) return false
    if (f.bands.length && !f.bands.includes(r.priceBand)) return false
    if (f.maxKm !== undefined && f.origin && distanceKm(f.origin, r) > f.maxKm) return false
    if (f.area && r.area !== f.area) return false
    if (f.audience.length && !f.audience.some((a) => r.tags.includes(AUDIENCE_TAG[a]))) return false
    if (f.cuisines.length && !f.cuisines.includes(r.cuisine)) return false
    if (f.dietary.length && !f.dietary.every((d) => r.tags.includes(d))) return false
    if (f.openNow && !isOpenNow(r, now)) return false
    return true
  })
}

export function sortRestaurants(list: Restaurant[], by: 'nearest' | 'price', origin?: LatLng): Restaurant[] {
  const copy = [...list]
  if (by === 'price') return copy.sort((a, b) => a.priceBand - b.priceBand)
  if (!origin) return copy
  return copy.sort((a, b) => distanceKm(origin, a) - distanceKm(origin, b))
}
