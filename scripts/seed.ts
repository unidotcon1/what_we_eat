import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import type { Day, Hours, PriceBand, Restaurant } from '../src/domain/types'

export const CUISINES = ['Chinese', 'Japanese', 'Western', 'Indian', 'Korean', 'Thai', 'Malay', 'Cafe', 'Dessert']

const DAYS: Day[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

/** "mon-thu 11:00-22:00;fri-sat 11:00-02:00" or "daily 10:00-20:00"; blank means hours unknown. */
export function parseHours(text: string): Hours | undefined {
  const src = text.trim()
  if (!src) return undefined
  const hours: Hours = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] }
  for (const part of src.split(';')) {
    const m = /^(daily|[a-z]{3}(?:-[a-z]{3})?)\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/i.exec(part.trim())
    if (!m) throw new Error(`bad hours "${src}"`)
    const [, days, open, close] = m
    const names = days.toLowerCase().split('-') as (Day | 'daily')[]
    if (names.some((n) => n !== 'daily' && !DAYS.includes(n))) throw new Error(`bad hours "${src}"`)
    let covered: Day[]
    if (names[0] === 'daily') covered = DAYS
    else if (names.length === 2) covered = DAYS.slice(DAYS.indexOf(names[0] as Day), DAYS.indexOf(names[1] as Day) + 1)
    else covered = [names[0] as Day]
    for (const d of covered) hours[d].push([open, close])
  }
  return hours
}

export type SkippedRow = { skip: string }

export function parseRestaurantRow(row: Record<string, string>): Restaurant | SkippedRow {
  const name = (row.name ?? '').trim()
  if (!name) return { skip: 'missing name' }
  const band = Number(row.price_band)
  if (!Number.isInteger(band) || band < 1 || band > 4) return { skip: 'missing price_band' }
  const cuisine = (row.cuisine ?? '').trim()
  if (!CUISINES.includes(cuisine)) return { skip: `unknown cuisine "${cuisine}"` }
  const lat = Number(row.lat)
  const lng = Number(row.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || row.lat === '' || row.lng === '') {
    return { skip: 'bad coordinates' }
  }
  let hours: Hours | undefined
  try {
    hours = parseHours(row.hours ?? '')
  } catch (e) {
    return { skip: (e as Error).message }
  }
  return {
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    name,
    area: (row.area ?? '').trim(),
    lat,
    lng,
    priceBand: band as PriceBand,
    cuisine,
    tags: (row.tags ?? '').split('|').map((t) => t.trim()).filter(Boolean),
    hours,
    closed: (row.closed ?? '').trim().toLowerCase() === 'yes',
  }
}

/** Minimal CSV reader: no quoted commas; use "|" inside a field to list several values. */
export function parseCsv(text: string): Record<string, string>[] {
  const [head, ...lines] = text.split(/\r?\n/).filter((l) => l.trim())
  const cols = head.split(',').map((c) => c.trim())
  return lines.map((line) => {
    const cells = line.split(',')
    return Object.fromEntries(cols.map((c, i) => [c, (cells[i] ?? '').trim()]))
  })
}

async function main() {
  const rows = parseCsv(readFileSync('data/sample-restaurants.csv', 'utf8'))
  const ok: Restaurant[] = []
  rows.forEach((row, i) => {
    const out = parseRestaurantRow(row)
    if ('skip' in out) console.warn(`row ${i + 2} skipped: ${out.skip}`)
    else ok.push(out)
  })
  writeFileSync('src/data/sample-restaurants.json', JSON.stringify(ok, null, 2))
  console.log(`wrote ${ok.length} restaurants to src/data/sample-restaurants.json`)

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (url && key) {
    const { createClient } = await import('@supabase/supabase-js')
    const db = createClient(url, key)
    const { error } = await db.from('restaurants').upsert(
      ok.map((r) => ({
        id: r.id,
        name: r.name,
        area: r.area,
        lat: r.lat,
        lng: r.lng,
        price_band: r.priceBand,
        cuisine: r.cuisine,
        tags: r.tags,
        hours: r.hours ?? null,
        closed: r.closed,
      })),
    )
    if (error) throw error
    console.log('upserted into Supabase')
  } else {
    console.log('SUPABASE_URL / SUPABASE_SERVICE_KEY not set: skipped database upsert')
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
