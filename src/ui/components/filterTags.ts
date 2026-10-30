import type { Audience, Filters, PriceBand } from '../../domain/types'

export const emptyFilters: Filters = {
  query: '',
  bands: [],
  audience: [],
  cuisines: [],
  dietary: [],
  openNow: false,
}

export type ActiveTag = { key: string; label: string }

const AUDIENCE_LABEL: Record<Audience, string> = { group: '6+ group', date: 'Date night', small: 'Solo / small' }

export function activeTags(f: Filters): ActiveTag[] {
  const tags: ActiveTag[] = []
  f.bands.forEach((b) => tags.push({ key: `band:${b}`, label: '$'.repeat(b) }))
  if (f.maxKm !== undefined) tags.push({ key: 'km', label: `${f.maxKm} km` })
  if (f.area) tags.push({ key: 'area', label: f.area })
  f.audience.forEach((a) => tags.push({ key: `aud:${a}`, label: AUDIENCE_LABEL[a] }))
  f.cuisines.forEach((c) => tags.push({ key: `cui:${c}`, label: c }))
  f.dietary.forEach((d) => tags.push({ key: `diet:${d}`, label: d[0].toUpperCase() + d.slice(1) }))
  if (f.openNow) tags.push({ key: 'open', label: 'Open now' })
  return tags
}

export function removeTag(f: Filters, key: string): Filters {
  const [kind, value] = key.split(':')
  switch (kind) {
    case 'band':
      return { ...f, bands: f.bands.filter((b) => b !== (Number(value) as PriceBand)) }
    case 'km':
      return { ...f, maxKm: undefined }
    case 'area':
      return { ...f, area: undefined }
    case 'aud':
      return { ...f, audience: f.audience.filter((a) => a !== value) }
    case 'cui':
      return { ...f, cuisines: f.cuisines.filter((c) => c !== value) }
    case 'diet':
      return { ...f, dietary: f.dietary.filter((d) => d !== value.toLowerCase()) }
    case 'open':
      return { ...f, openNow: false }
    default:
      return f
  }
}
