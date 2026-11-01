import { distanceKm } from './filters'
import { clean_text, name_similarity } from './text'
import { set_spot_state, spot_input_from_restaurant, type NewSpot, type SetOutcome, type Spot, type SpotState } from './spots'
import type { Restaurant } from './types'

/* ---------- reading a Google Takeout file ---------- */

export type TakeoutRow = {
  title: string
  address: string
  lat: number | null
  lng: number | null
  url: string
  note: string
}

/** errors stop the import; warnings are shown but the import goes ahead. */
export type ParseResult = { rows: TakeoutRow[]; format: 'json' | 'csv' | 'unknown'; errors: string[]; warnings: string[] }

/** Same ceilings as the database (migration 004), so a saved spot is never refused later. */
export const MAX_NAME = 120
export const MAX_ADDRESS = 200
export const MAX_NOTE = 500
export const MAX_ROWS = 5000

const in_range = (lat: number, lng: number) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180

/** Pulls a latitude and longitude out of a Google Maps address, when it has one. */
export function coords_from_url(url: string): { lat: number; lng: number } | null {
  const patterns = [/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, /@(-?\d+\.\d+),(-?\d+\.\d+)/, /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/]
  for (const p of patterns) {
    const m = p.exec(url)
    if (m && in_range(Number(m[1]), Number(m[2]))) return { lat: Number(m[1]), lng: Number(m[2]) }
  }
  return null
}

function name_from_url(url: string): string {
  const m = /\/maps\/place\/([^/@?]+)/.exec(url)
  if (!m) return ''
  try {
    return decodeURIComponent(m[1].replace(/\+/g, ' ')).trim()
  } catch {
    return ''
  }
}

type Loose = Record<string, unknown>
const as_text = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const as_obj = (v: unknown): Loose => (v && typeof v === 'object' ? (v as Loose) : {})

function usable(lat: number, lng: number) {
  return in_range(lat, lng) && !(lat === 0 && lng === 0)
}

function row_from_feature(feature: unknown): TakeoutRow {
  const f = as_obj(feature)
  const props = as_obj(f.properties)
  const loc = as_obj(props.location ?? props.Location)
  const url = as_text(props.google_maps_url ?? props['Google Maps URL'])
  const title = as_text(props.Title ?? props.title) || as_text(loc.name) || as_text(loc['Business Name']) || name_from_url(url)

  let lat: number | null = null
  let lng: number | null = null
  const coordinates = as_obj(f.geometry).coordinates
  if (Array.isArray(coordinates) && usable(Number(coordinates[1]), Number(coordinates[0]))) {
    lat = Number(coordinates[1])
    lng = Number(coordinates[0])
  }
  if (lat === null) {
    const geo = as_obj(loc['Geo Coordinates'])
    if (usable(Number(geo.Latitude), Number(geo.Longitude))) {
      lat = Number(geo.Latitude)
      lng = Number(geo.Longitude)
    }
  }
  if (lat === null) {
    const c = coords_from_url(url)
    if (c) {
      lat = c.lat
      lng = c.lng
    }
  }
  return { title, address: as_text(loc.address ?? loc.Address), lat, lng, url, note: as_text(props.Comment) }
}

/** Minimal CSV reader: quotes, doubled quotes, commas and line breaks inside quotes, Windows line endings. */
function read_csv(text: string): string[][] {
  const rows: string[][] = []
  let cell = ''
  let row: string[] = []
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell !== '' || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

function cleaned(row: TakeoutRow): TakeoutRow {
  return {
    ...row,
    title: clean_text(row.title, MAX_NAME),
    address: clean_text(row.address, MAX_ADDRESS),
    note: clean_text(row.note, MAX_NOTE),
  }
}

/** Cleans every row, keeps at most MAX_ROWS, and says so when it had to cut. */
function finish(rows: TakeoutRow[], format: 'json' | 'csv'): ParseResult {
  const warnings = rows.length > MAX_ROWS ? [`This file has ${rows.length} places. Only the first ${MAX_ROWS} were read.`] : []
  return { rows: rows.slice(0, MAX_ROWS).map(cleaned), format, errors: [], warnings }
}

export function parse_takeout(raw: string): ParseResult {
  const text = raw.replace(/^﻿/, '').trim()
  if (!text) return { rows: [], format: 'unknown', errors: ['The file is empty.'], warnings: [] }

  if (text.startsWith('{') || text.startsWith('[')) {
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      return { rows: [], format: 'json', errors: ['The file is not valid JSON.'], warnings: [] }
    }
    const features = Array.isArray(data) ? data : as_obj(data).features
    if (!Array.isArray(features) || features.length === 0) return { rows: [], format: 'json', errors: ['No places found in this file.'], warnings: [] }
    return finish(features.map(row_from_feature), 'json')
  }

  const table = read_csv(text)
  const header = (table[0] ?? []).map((h) => h.trim().toLowerCase())
  const title_at = header.findIndex((h) => h === 'title' || h === 'name')
  if (title_at < 0) return { rows: [], format: 'csv', errors: ['This CSV has no Title column, so it does not look like a Google Maps list export.'], warnings: [] }
  const url_at = header.indexOf('url')
  const note_at = header.indexOf('note')

  const rows: TakeoutRow[] = []
  for (const cells of table.slice(1)) {
    const url = url_at >= 0 ? (cells[url_at] ?? '').trim() : ''
    const title = (cells[title_at] ?? '').trim() || name_from_url(url)
    if (!title && !url) continue
    const c = coords_from_url(url)
    rows.push({ title, address: '', lat: c?.lat ?? null, lng: c?.lng ?? null, url, note: note_at >= 0 ? (cells[note_at] ?? '').trim() : '' })
  }
  if (rows.length === 0) return { rows: [], format: 'csv', errors: ['No places found in this file.'], warnings: [] }
  return finish(rows, 'csv')
}

/* ---------- matching rows to our catalogue ---------- */

export type MatchedRow = {
  row: TakeoutRow
  place: Restaurant
  confidence: 'high' | 'medium' | 'name_only'
  distance_m: number | null
}

export type UnmatchedRow = {
  row: TakeoutRow
  reason: 'no_name' | 'no_nearby_place' | 'not_in_catalogue' | 'ambiguous'
  /** true when the row has a location, so it can be added as a new place */
  can_add: boolean
}

export type MatchReport = {
  matched: MatchedRow[]
  unmatched: UnmatchedRow[]
  summary: { total: number; matched: number; unmatched: number; addable: number; ambiguous: number }
}

const NEAR_M = 150

export function match_rows(rows: TakeoutRow[], catalog: Restaurant[]): MatchReport {
  const matched: MatchedRow[] = []
  const unmatched: UnmatchedRow[] = []

  for (const row of rows) {
    if (!row.title) {
      unmatched.push({ row, reason: 'no_name', can_add: false })
      continue
    }

    if (row.lat !== null && row.lng !== null) {
      const here = { lat: row.lat, lng: row.lng }
      const near = catalog
        .map((place) => ({ place, distance_m: distanceKm(here, place) * 1000, similarity: name_similarity(row.title, place.name) }))
        .filter((c) => c.distance_m <= NEAR_M)
        .sort((a, b) => b.similarity - a.similarity || a.distance_m - b.distance_m)
      const best = near[0]
      if (best && (best.similarity >= 0.5 || (best.similarity >= 0.34 && best.distance_m <= 60))) {
        matched.push({
          row,
          place: best.place,
          confidence: best.similarity >= 0.7 && best.distance_m <= 100 ? 'high' : 'medium',
          distance_m: Math.round(best.distance_m),
        })
      } else {
        unmatched.push({ row, reason: 'no_nearby_place', can_add: true })
      }
      continue
    }

    const same = catalog.filter((place) => name_similarity(row.title, place.name) === 1)
    if (same.length === 1) matched.push({ row, place: same[0], confidence: 'name_only', distance_m: null })
    else if (same.length > 1) unmatched.push({ row, reason: 'ambiguous', can_add: false })
    else unmatched.push({ row, reason: 'not_in_catalogue', can_add: false })
  }

  return {
    matched,
    unmatched,
    summary: {
      total: rows.length,
      matched: matched.length,
      unmatched: unmatched.length,
      addable: unmatched.filter((u) => u.can_add).length,
      ambiguous: unmatched.filter((u) => u.reason === 'ambiguous').length,
    },
  }
}

/* ---------- writing the confirmed import ---------- */

export type ImportCounts = Record<SetOutcome, number>

/** Adds the matched rows (and optionally the located unmatched ones) in one state. Never demotes a Conquered place. */
export function apply_import(
  spots: Spot[],
  report: MatchReport,
  state: SpotState,
  now: string,
  options: { include_unmatched: boolean },
): { spots: Spot[]; counts: ImportCounts } {
  const counts: ImportCounts = { added: 0, moved: 0, unchanged: 0, kept: 0 }
  let next = spots
  const put = (input: NewSpot) => {
    const out = set_spot_state(next, input, state, now, { never_downgrade: true })
    next = out.spots
    counts[out.outcome]++
  }
  for (const m of report.matched) put({ ...spot_input_from_restaurant(m.place), source: 'import' })
  if (options.include_unmatched) {
    for (const u of report.unmatched) {
      if (u.can_add && u.row.lat !== null && u.row.lng !== null) {
        const name = clean_text(u.row.title, MAX_NAME)
        if (!name) continue
        put({ place_id: null, name, address: clean_text(u.row.address, MAX_ADDRESS), lat: u.row.lat, lng: u.row.lng, source: 'import' })
      }
    }
  }
  return { spots: next, counts }
}
