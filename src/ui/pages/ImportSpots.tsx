import { useState } from 'react'
import { Link } from 'react-router-dom'
import { get_catalog } from '../../data/catalog'
import type { SpotState } from '../../domain/spots'
import { apply_import, match_rows, parse_takeout, type ImportCounts, type MatchReport, type UnmatchedRow } from '../../domain/takeout'
import { get_spots } from '../../local/spots_store'
import { use_spot_actions } from '../use_spot_actions'

const MAX_BYTES = 5 * 1024 * 1024
const MAX_LISTED = 30

const REASON: Record<UnmatchedRow['reason'], (u: UnmatchedRow) => string> = {
  no_name: () => 'No name in the file',
  no_nearby_place: () => 'Not in our list yet (can be added)',
  not_in_catalogue: () => 'Not in our list, and no location to add it',
  ambiguous: () => 'Several of our places share this name',
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

export default function ImportSpots() {
  const { commit_spots } = use_spot_actions()
  const [report, set_report] = useState<MatchReport | null>(null)
  const [error, set_error] = useState<string | null>(null)
  const [warning, set_warning] = useState<string | null>(null)
  const [state_choice, set_state_choice] = useState<SpotState>('targeted')
  const [include_unmatched, set_include_unmatched] = useState(true)
  const [done, set_done] = useState<ImportCounts | null>(null)

  async function on_file(file: File | undefined) {
    set_report(null)
    set_error(null)
    set_warning(null)
    set_done(null)
    if (!file) return
    if (file.size > MAX_BYTES) {
      set_error('That file is too big (over 5 MB). Export one list at a time and try again.')
      return
    }
    try {
      const parsed = parse_takeout(await file.text())
      if (parsed.errors.length) {
        set_error(parsed.errors[0])
        return
      }
      set_warning(parsed.warnings[0] ?? null)
      set_report(match_rows(parsed.rows, await get_catalog()))
    } catch {
      set_error('Could not read that file. Try another one.')
    }
  }

  const matched = report?.summary.matched ?? 0
  const addable = report?.summary.addable ?? 0
  const to_import = matched + (include_unmatched ? addable : 0)

  function run_import() {
    if (!report) return
    const { spots, counts } = apply_import(get_spots(), report, state_choice, new Date().toISOString(), { include_unmatched })
    commit_spots(spots)
    set_done(counts)
  }

  return (
    <>
      <h1>Import from Google Maps</h1>
      <p className="sub">Bring in a list you already saved in Google Maps. The file itself is not uploaded: it is read on this device. The places you import are saved like any other Spot, and saved to your account if you are signed in.</p>

      <ol className="steps">
        <li>
          Open{' '}
          <a href="https://takeout.google.com" target="_blank" rel="noreferrer">
            takeout.google.com
          </a>{' '}
          and sign in.
        </li>
        <li>Choose only your saved places (the “Saved” lists, or “Maps (your places)”), then create and download the export.</li>
        <li>Unzip it and pick one list file (.csv or .json) below.</li>
      </ol>
      <p className="sub">Google changes its export from time to time. If your file does not work, try another file from the same export.</p>

      <label className="file-pick">
        Choose your file
        <input type="file" accept=".csv,.json,application/json,text/csv" onChange={(e) => void on_file(e.target.files?.[0])} />
      </label>

      {error && <p role="alert">{error}</p>}
      {warning && (
        <p role="status" aria-label="Notice">
          {warning}
        </p>
      )}

      {report && !done && (
        <section aria-label="Preview">
          <p>
            We found {report.summary.total} {plural(report.summary.total, 'place', 'places')}: {matched} matched our list,{' '}
            {report.summary.unmatched} {plural(report.summary.unmatched, 'is', 'are')} not in our list yet.
          </p>

          {report.matched.length > 0 && (
            <>
              <h2>Matched</h2>
              <ul className="preview-list" aria-label="Matched places">
                {report.matched.slice(0, MAX_LISTED).map((m, i) => (
                  <li key={i}>
                    {m.row.title}
                    {m.row.title !== m.place.name ? <span className="sub"> → {m.place.name}</span> : null}
                  </li>
                ))}
                {report.matched.length > MAX_LISTED && <li className="sub">and {report.matched.length - MAX_LISTED} more</li>}
              </ul>
            </>
          )}

          {report.unmatched.length > 0 && (
            <>
              <h2>Not matched</h2>
              <ul className="preview-list" aria-label="Not matched">
                {report.unmatched.slice(0, MAX_LISTED).map((u, i) => (
                  <li key={i}>
                    {u.row.title || '(no name)'}
                    <span className="sub"> · {REASON[u.reason](u)}</span>
                  </li>
                ))}
                {report.unmatched.length > MAX_LISTED && <li className="sub">and {report.unmatched.length - MAX_LISTED} more</li>}
              </ul>
            </>
          )}

          <fieldset className="choice">
            <legend>Add them as</legend>
            <label>
              <input type="radio" name="state" checked={state_choice === 'targeted'} onChange={() => set_state_choice('targeted')} />
              Targets
            </label>
            <label>
              <input type="radio" name="state" checked={state_choice === 'conquered'} onChange={() => set_state_choice('conquered')} />
              Conquered
            </label>
          </fieldset>

          {addable > 0 && (
            <label className="choice">
              <input type="checkbox" checked={include_unmatched} onChange={(e) => set_include_unmatched(e.target.checked)} />
              Also add the {addable} {plural(addable, 'place that is', 'places that are')} not in our list yet
            </label>
          )}

          <p className="sub">Nothing is saved until you press the button. A place you already conquered stays conquered.</p>
          <button type="button" className="apply" disabled={to_import === 0} onClick={run_import}>
            {to_import === 0 ? 'Nothing to import' : `Import ${to_import} ${plural(to_import, 'place', 'places')}`}
          </button>
        </section>
      )}

      {done && (
        <section aria-label="Result">
          <p role="status">
            Done. Added {done.added}, moved {done.moved}, already there {done.unchanged}, kept as Conquered {done.kept}.
          </p>
          <Link className="apply" to="/spots">
            See my Spots
          </Link>
        </section>
      )}
    </>
  )
}
