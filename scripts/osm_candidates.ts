// Builds a CANDIDATE list of Singapore food places from OpenStreetMap, for the owner to curate by hand.
// It only reads from the public Overpass API and writes a CSV under data/candidates/. It never touches the app or the database.
// Usage: npm run candidates:osm            (uses the saved download if there is one)
//        npm run candidates:osm -- --refresh   (download again)
//
// Licence: OpenStreetMap data is © OpenStreetMap contributors, ODbL. Every row keeps a `source` column so the credit
// travels with it. If you publish a restaurant list built from this, credit OpenStreetMap and keep that list open.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { distanceKm } from '../src/domain/filters'

export type OsmElement = {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

export type Candidate = {
  name: string
  area: string
  lat: string
  lng: string
  price_band: string
  cuisine: string
  tags: string
  hours: string
  closed: string
  osm_id: string
  osm_cuisine: string
  source: string
}

export type Skipped = { skip: string }

const SOURCE = 'OpenStreetMap contributors (ODbL)'

/* ---------- cuisine ---------- */

const CUISINE_WORDS: Record<string, string[]> = {
  Chinese: ['chinese', 'cantonese', 'hokkien', 'teochew', 'hainanese', 'hakka', 'szechuan', 'sichuan', 'dim_sum', 'hotpot', 'hot_pot', 'taiwanese'],
  Japanese: ['japanese', 'sushi', 'ramen', 'izakaya', 'yakiniku', 'tempura', 'udon', 'teppanyaki'],
  Western: ['western', 'italian', 'french', 'american', 'burger', 'pizza', 'steak_house', 'steak', 'pasta', 'british', 'german', 'spanish', 'mexican', 'greek', 'mediterranean', 'sandwich'],
  Indian: ['indian', 'north_indian', 'south_indian', 'prata', 'pakistani', 'nepalese', 'sri_lankan'],
  Korean: ['korean', 'korean_bbq'],
  Thai: ['thai', 'vietnamese'],
  Malay: ['malay', 'malaysian', 'indonesian', 'singaporean', 'peranakan', 'nasi_lemak', 'nyonya'],
  Cafe: ['coffee_shop', 'cafe', 'coffee', 'tea', 'bubble_tea', 'brunch'],
  Dessert: ['ice_cream', 'dessert', 'cake', 'bakery', 'waffle', 'frozen_yogurt', 'crepe'],
}

const CUISINE_LOOKUP = new Map<string, string>()
for (const [cuisine, words] of Object.entries(CUISINE_WORDS)) for (const w of words) CUISINE_LOOKUP.set(w, cuisine)

/** Maps an OpenStreetMap cuisine value (for example "seafood;chinese") to one of the app's cuisines, or '' if none fits. */
export function map_cuisine(raw: string): string {
  for (const part of raw.split(';')) {
    const word = part.trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/_cuisine$/, '')
    const found = CUISINE_LOOKUP.get(word)
    if (found) return found
  }
  return ''
}

/* ---------- opening hours ---------- */

const DAY_NAMES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const OSM_DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const TIME_RANGE = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/

function valid_time(h: string, m: string) {
  return Number(h) <= 24 && Number(m) < 60
}

/** Turns simple OpenStreetMap opening_hours into the seed format; anything fancier returns '' so the owner fills it in. */
export function convert_opening_hours(osm: string): string {
  const text = osm.trim()
  if (!text) return ''
  if (text === '24/7') return 'daily 00:00-24:00'

  const parts: string[] = []
  for (const raw_rule of text.split(';')) {
    const rule = raw_rule.trim()
    if (!rule) continue
    const m = /^([A-Za-z]{2}(?:-[A-Za-z]{2})?(?:,[A-Za-z]{2}(?:-[A-Za-z]{2})?)*)\s+(.+)$/.exec(rule)
    const days_spec = m ? m[1] : ''
    const rest = m ? m[2] : rule
    const day_items = days_spec ? days_spec.split(',') : OSM_DAYS.slice(0)
    const items = day_items.filter((d) => d !== 'PH' && d !== 'SH')
    if (items.length === 0) continue // public-holiday rule: ignored
    if (/^(off|closed)$/i.test(rest)) continue

    // days -> set of day indexes
    const days = new Set<number>()
    for (const item of items) {
      const [a, b] = item.split('-')
      const i = OSM_DAYS.indexOf(a)
      const j = b === undefined ? i : OSM_DAYS.indexOf(b)
      if (i < 0 || j < 0 || j < i) return ''
      for (let d = i; d <= j; d++) days.add(d)
    }

    const ranges = rest.split(',').map((r) => r.trim())
    for (const r of ranges) {
      const t = TIME_RANGE.exec(r)
      if (!t || !valid_time(t[1], t[2]) || !valid_time(t[3], t[4])) return ''
    }

    // consecutive runs of days
    const sorted = [...days].sort((x, y) => x - y)
    const runs: [number, number][] = []
    for (const d of sorted) {
      const last = runs[runs.length - 1]
      if (last && last[1] === d - 1) last[1] = d
      else runs.push([d, d])
    }
    for (const [from, to] of runs) {
      const label = from === 0 && to === 6 ? 'daily' : from === to ? DAY_NAMES[from] : `${DAY_NAMES[from]}-${DAY_NAMES[to]}`
      for (const r of ranges) parts.push(`${label} ${r}`)
    }
  }
  return parts.join(';')
}

/* ---------- area ---------- */

// Approximate centres of well-known Singapore areas (facts, rounded). A place is named after the nearest one within 2.5 km.
const AREA_CENTRES: [string, number, number][] = [
  ['Orchard', 1.3048, 103.8318], ['Bugis', 1.3, 103.8559], ['Chinatown', 1.2838, 103.844], ['Tanjong Pagar', 1.2766, 103.8458],
  ['Marina Bay', 1.2830, 103.8600], ['Clarke Quay', 1.2889, 103.8467], ['Robertson Quay', 1.29, 103.838], ['Little India', 1.3067, 103.8518],
  ['Holland Village', 1.3112, 103.796], ['Tiong Bahru', 1.2862, 103.8326], ['Katong', 1.305, 103.905], ['Geylang', 1.315, 103.887],
  ['Jurong East', 1.3329, 103.7436], ['Tampines', 1.3496, 103.9568], ['Bedok', 1.3236, 103.9273], ['Woodlands', 1.4382, 103.789],
  ['Yishun', 1.4304, 103.8354], ['Toa Payoh', 1.3343, 103.8563], ['Serangoon', 1.3554, 103.8679], ['Hougang', 1.3612, 103.8863],
  ['Clementi', 1.3162, 103.7649], ['Bukit Timah', 1.3294, 103.8021], ['Dempsey', 1.3052, 103.8105], ['Novena', 1.3203, 103.8438],
  ['Kallang', 1.3114, 103.8714], ['Paya Lebar', 1.3177, 103.8928], ['Sembawang', 1.4491, 103.8185], ['Punggol', 1.4043, 103.9021],
  ['Sengkang', 1.3868, 103.8914], ['Bishan', 1.3508, 103.8485], ['Ang Mo Kio', 1.3691, 103.8454], ['Pasir Ris', 1.3721, 103.9474],
  ['Changi', 1.3644, 103.9915], ['Sentosa', 1.2494, 103.8303], ['HarbourFront', 1.2653, 103.8222], ['Queenstown', 1.2942, 103.7861],
  ['Buona Vista', 1.3067, 103.79], ['Boon Lay', 1.3386, 103.7060], ['Bukit Batok', 1.349, 103.7496], ['Choa Chu Kang', 1.3840, 103.7470],
  ['Maxwell', 1.2806, 103.8449], ['Botanic Gardens', 1.3138, 103.8159], ['Lavender', 1.3075, 103.8631], ['Telok Ayer', 1.2810, 103.8480],
  ['River Valley', 1.2937, 103.8350], ['Thomson', 1.3540, 103.8330], ['Bukit Merah', 1.2819, 103.8239], ['Jurong West', 1.3404, 103.7090],
]

export function nearest_area(lat: number, lng: number): string {
  let best = ''
  let best_km = 2.5
  for (const [name, a_lat, a_lng] of AREA_CENTRES) {
    const km = distanceKm({ lat, lng }, { lat: a_lat, lng: a_lng })
    if (km < best_km) {
      best = name
      best_km = km
    }
  }
  return best
}

/* ---------- one element -> one candidate ---------- */

const FOOD_CENTRE = /food\s*(centre|center|court|village)|hawker/i

const clean = (s: string) => s.replace(/[,"\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()

export function to_candidate(el: OsmElement): Candidate | Skipped {
  const tags = el.tags ?? {}
  const name = clean(tags.name ?? '')
  if (!name) return { skip: 'no name' }
  if (FOOD_CENTRE.test(name)) return { skip: 'looks like a food centre' }

  const lat = el.lat ?? el.center?.lat
  const lng = el.lon ?? el.center?.lon
  if (lat === undefined || lng === undefined) return { skip: 'no coordinates' }
  if (lat < 1.15 || lat > 1.5 || lng < 103.55 || lng > 104.15) return { skip: 'outside Singapore' }

  let cuisine = map_cuisine(tags.cuisine ?? '')
  if (!cuisine && tags.amenity === 'cafe') cuisine = 'Cafe'

  const extra_tags: string[] = []
  if (tags['diet:halal'] === 'yes' || tags['diet:halal'] === 'only') extra_tags.push('halal')
  if (tags['diet:vegetarian'] === 'yes' || tags['diet:vegetarian'] === 'only') extra_tags.push('vegetarian')

  return {
    name,
    area: nearest_area(lat, lng),
    lat: lat.toFixed(5),
    lng: lng.toFixed(5),
    price_band: '',
    cuisine,
    tags: extra_tags.join('|'),
    hours: convert_opening_hours(tags.opening_hours ?? ''),
    closed: '',
    osm_id: `${el.type}/${el.id}`,
    osm_cuisine: clean(tags.cuisine ?? ''),
    source: SOURCE,
  }
}

/** Drops repeats of the same name within about 30 metres; two branches far apart both stay. */
export function dedupe_candidates(list: Candidate[]): Candidate[] {
  const kept: Candidate[] = []
  for (const c of list) {
    const dup = kept.some(
      (k) =>
        k.name.toLowerCase() === c.name.toLowerCase() &&
        Math.abs(Number(k.lat) - Number(c.lat)) < 0.0003 &&
        Math.abs(Number(k.lng) - Number(c.lng)) < 0.0003,
    )
    if (!dup) kept.push(c)
  }
  return kept
}

const COLUMNS: (keyof Candidate)[] = ['name', 'area', 'lat', 'lng', 'price_band', 'cuisine', 'tags', 'hours', 'closed', 'osm_id', 'osm_cuisine', 'source']

export function to_csv(list: Candidate[]): string {
  return [COLUMNS.join(','), ...list.map((c) => COLUMNS.map((k) => c[k]).join(','))].join('\n')
}

/* ---------- download and run ---------- */

const RAW_FILE = 'data/candidates/osm-raw.json'
const OUT_FILE = 'data/candidates/osm-sg-candidates.csv'
const QUERY = `[out:json][timeout:120];area["ISO3166-1"="SG"]->.a;nwr["amenity"~"^(restaurant|cafe|fast_food)$"]["name"](area.a);out tags center;`

async function download(): Promise<OsmElement[]> {
  const waits = [0, 20000, 40000]
  let last_error = ''
  for (const wait of waits) {
    if (wait) await new Promise((r) => setTimeout(r, wait))
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'User-Agent': 'what-we-eat-candidates (github.com/unidotcon1/what_we_eat)', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(QUERY)}`,
    })
    if (res.ok) return ((await res.json()) as { elements: OsmElement[] }).elements
    last_error = `HTTP ${res.status}`
  }
  throw new Error(`Overpass is busy or refused the request (${last_error}). Try again in a few minutes.`)
}

async function main() {
  mkdirSync('data/candidates', { recursive: true })
  let elements: OsmElement[]
  if (existsSync(RAW_FILE) && !process.argv.includes('--refresh')) {
    elements = JSON.parse(readFileSync(RAW_FILE, 'utf8')) as OsmElement[]
    console.log(`using the saved download (${elements.length} elements); add --refresh to download again`)
  } else {
    console.log('downloading from Overpass (one request; can take a minute)...')
    elements = await download()
    writeFileSync(RAW_FILE, JSON.stringify(elements))
    console.log(`downloaded ${elements.length} elements`)
  }

  const skipped = new Map<string, number>()
  const parsed: Candidate[] = []
  for (const el of elements) {
    const c = to_candidate(el)
    if ('skip' in c) skipped.set(c.skip, (skipped.get(c.skip) ?? 0) + 1)
    else parsed.push(c)
  }
  const kept = dedupe_candidates(parsed)
  kept.sort((a, b) => a.area.localeCompare(b.area) || a.name.localeCompare(b.name))
  writeFileSync(OUT_FILE, to_csv(kept))

  const pct = (n: number) => `${n} (${Math.round((n / Math.max(kept.length, 1)) * 100)}%)`
  console.log(`\nwrote ${kept.length} candidates to ${OUT_FILE}`)
  console.log(`skipped: ${[...skipped].map(([k, v]) => `${v} ${k}`).join(', ') || 'none'}; duplicates removed: ${parsed.length - kept.length}`)
  console.log(`with a cuisine: ${pct(kept.filter((c) => c.cuisine).length)}`)
  console.log(`with opening hours: ${pct(kept.filter((c) => c.hours).length)}`)
  console.log(`with an area name: ${pct(kept.filter((c) => c.area).length)}`)
  console.log(`halal-tagged: ${kept.filter((c) => c.tags.includes('halal')).length}, vegetarian-tagged: ${kept.filter((c) => c.tags.includes('vegetarian')).length}`)
  console.log('price_band is blank on purpose: fill it in yourself, along with tags like group, date, quiet.')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
  })
}
