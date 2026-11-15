export type PriceBand = 1 | 2 | 3 | 4

export type Day = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

/** Opening periods per day as ["HH:MM", "HH:MM"]; an end at or before the start runs past midnight. */
export type Hours = Record<Day, [string, string][]>

export type LatLng = { lat: number; lng: number }

export type MenuSection = { section: string; items: { name: string; price?: string }[] }

export type Restaurant = {
  id: string
  name: string
  area: string
  lat: number
  lng: number
  priceBand: PriceBand
  cuisine: string
  tags: string[]
  hours?: Hours
  closed: boolean
  /** A picture file of ours, under /restaurants/. */
  image?: string
  /** The restaurant's own menu page (https). */
  menu_url?: string
  menu?: MenuSection[]
}

export type Audience = 'group' | 'date' | 'small'

export type Filters = {
  query: string
  bands: PriceBand[]
  maxKm?: number
  origin?: LatLng
  area?: string
  audience: Audience[]
  cuisines: string[]
  dietary: string[]
  openNow: boolean
}
