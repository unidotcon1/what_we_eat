import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ImportSpots from './ImportSpots'
import { get_spots, reset_spots_store_for_test } from '../../local/spots_store'
import type { Spot } from '../../domain/spots'

const feature = (title: string, lng?: number, lat?: number) => ({
  type: 'Feature',
  geometry: lng === undefined ? undefined : { type: 'Point', coordinates: [lng, lat] },
  properties: { Title: title, google_maps_url: `https://www.google.com/maps/place/${encodeURIComponent(title)}` },
})

// Kopi & Kin is in our list at this exact spot; "Some New Cafe" has a location but is not in our list;
// "No Location Place" has neither a match nor a location.
const takeout_json = JSON.stringify({
  type: 'FeatureCollection',
  features: [feature('Kopi & Kin', 103.8326, 1.2862), feature('Some New Cafe', 103.9, 1.35), feature('No Location Place')],
})

const takeout_csv = ['Title,Note,URL', 'Kopi & Kin,,https://www.google.com/maps/place/Kopi+%26+Kin/@1.2862,103.8326,17z'].join('\n')

const file = (content: string, name: string, type: string) => new File([content], name, { type })

beforeEach(() => {
  localStorage.clear()
  reset_spots_store_for_test()
})

const setup = () =>
  render(
    <MemoryRouter>
      <ImportSpots />
    </MemoryRouter>,
  )

async function choose(f: File) {
  await userEvent.upload(screen.getByLabelText('Choose your file'), f)
}

test('explains how to get the file and says it never leaves the phone', () => {
  setup()
  expect(screen.getByRole('heading', { level: 1, name: 'Import from Google Maps' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /takeout\.google\.com/ })).toHaveAttribute('href', 'https://takeout.google.com')
  expect(screen.getByText(/read on this device/i)).toBeInTheDocument()
  expect(screen.getByLabelText('Choose your file')).toBeInTheDocument()
})

test('after choosing a file it shows what matched and what did not, and writes nothing yet', async () => {
  setup()
  await choose(file(takeout_json, 'Saved Places.json', 'application/json'))
  expect(await screen.findByText(/We found 3 places/)).toBeInTheDocument()
  expect(screen.getByText(/1 matched our list/)).toBeInTheDocument()
  expect(within_list('Matched places')).toContain('Kopi & Kin')
  expect(within_list('Not matched')).toContain('Some New Cafe')
  expect(within_list('Not matched')).toContain('No Location Place')
  expect(get_spots()).toHaveLength(0)
})

function within_list(name: string): string {
  return screen.getByRole('list', { name }).textContent ?? ''
}

test('importing as Targets adds the matched place and the new place with a location', async () => {
  setup()
  await choose(file(takeout_json, 'Saved Places.json', 'application/json'))
  await userEvent.click(await screen.findByRole('button', { name: 'Import 2 places' }))
  expect(await screen.findByText(/Added 2/)).toBeInTheDocument()
  const spots = get_spots()
  expect(spots).toHaveLength(2)
  expect(spots.every((s) => s.state === 'targeted')).toBe(true)
  expect(spots.find((s) => s.place_id === 'kopi-kin')).toBeDefined()
  expect(spots.find((s) => s.name === 'Some New Cafe')).toMatchObject({ place_id: null, source: 'import' })
})

test('choosing Conquered imports them as Conquered Spots', async () => {
  setup()
  await choose(file(takeout_json, 'Saved Places.json', 'application/json'))
  await userEvent.click(await screen.findByRole('radio', { name: 'Conquered' }))
  await userEvent.click(screen.getByRole('button', { name: 'Import 2 places' }))
  await screen.findByText(/Added 2/)
  expect(get_spots().every((s) => s.state === 'conquered')).toBe(true)
})

test('unticking "also add" imports only the places already in our list', async () => {
  setup()
  await choose(file(takeout_json, 'Saved Places.json', 'application/json'))
  await userEvent.click(await screen.findByRole('checkbox', { name: /Also add the 1 place that is not in our list yet/ }))
  await userEvent.click(screen.getByRole('button', { name: 'Import 1 place' }))
  await screen.findByText(/Added 1/)
  expect(get_spots().map((s) => s.place_id)).toEqual(['kopi-kin'])
})

test('a place that is already Conquered is never moved back to Targets by an import', async () => {
  const base: Spot = {
    id: 'r:kopi-kin',
    place_id: 'kopi-kin',
    name: 'Kopi & Kin',
    address: 'Tiong Bahru',
    lat: 1.2862,
    lng: 103.8326,
    state: 'conquered',
    source: 'catalog',
    created_at: '2026-11-01T10:00:00.000Z',
    updated_at: '2026-11-01T10:00:00.000Z',
    conquered_at: '2026-11-01T10:00:00.000Z',
  }
  localStorage.setItem('wwe.spots', JSON.stringify([base]))
  setup()
  await choose(file(takeout_json, 'Saved Places.json', 'application/json'))
  await userEvent.click(await screen.findByRole('button', { name: 'Import 2 places' }))
  await screen.findByText(/kept as Conquered 1/)
  expect(get_spots().find((s) => s.place_id === 'kopi-kin')?.state).toBe('conquered')
})

test('a CSV list export works too', async () => {
  setup()
  await choose(file(takeout_csv, 'My list.csv', 'text/csv'))
  expect(await screen.findByText(/We found 1 place\b/)).toBeInTheDocument()
  expect(within_list('Matched places')).toContain('Kopi & Kin')
})

test('a file that is not a Google Maps export shows a clear message and no import button', async () => {
  setup()
  await choose(file('hello there', 'notes.csv', 'text/csv'))
  expect(await screen.findByRole('alert')).toHaveTextContent(/does not look like a Google Maps list/i)
  expect(screen.queryByRole('button', { name: /^Import/ })).not.toBeInTheDocument()
})

test('a file over 5 MB is refused before it is read', async () => {
  setup()
  await choose(file('x'.repeat(5 * 1024 * 1024 + 1), 'huge.csv', 'text/csv'))
  expect(await screen.findByRole('alert')).toHaveTextContent(/too big/i)
  expect(screen.queryByRole('button', { name: /^Import/ })).not.toBeInTheDocument()
})

test('when nothing can be imported the button says so and is disabled', async () => {
  setup()
  await choose(file(JSON.stringify({ features: [feature('Nowhere Special')] }), 'x.json', 'application/json'))
  const button = await screen.findByRole('button', { name: 'Nothing to import' })
  expect(button).toBeDisabled()
})

test('after importing there is a link to see the Spots', async () => {
  setup()
  await choose(file(takeout_json, 'Saved Places.json', 'application/json'))
  await userEvent.click(await screen.findByRole('button', { name: 'Import 2 places' }))
  expect(await screen.findByRole('link', { name: 'See my Spots' })).toHaveAttribute('href', '/spots')
})

test('the privacy line is honest: the file is not uploaded, but the places you import are saved to your account when signed in', () => {
  setup()
  expect(screen.getByText(/file itself is not uploaded/i)).toBeInTheDocument()
  expect(screen.getByText(/saved to your account/i)).toBeInTheDocument()
  expect(screen.queryByText(/never uploaded/i)).not.toBeInTheDocument()
})

test('a file with more than 5000 places still imports the first 5000 and says so', async () => {
  setup()
  const features = Array.from({ length: 5100 }, (_, i) => feature(`Place ${i}`, 103.9 + i * 0.00001, 1.35))
  await choose(file(JSON.stringify({ features }), 'big.json', 'application/json'))
  expect(await screen.findByRole('status', { name: /notice/i })).toHaveTextContent(/first 5000/)
  expect(screen.getByRole('button', { name: /^Import/ })).toBeInTheDocument()
})
