import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Spots from './Spots'
import { reset_spots_store_for_test } from '../../local/spots_store'
import { clear_sync_problem, report_sync_problem } from '../../local/sync_status'
import type { Spot } from '../../domain/spots'

const make = (over: Partial<Spot>): Spot => ({
  id: 'r:kopi-kin',
  place_id: 'kopi-kin',
  name: 'Kopi & Kin',
  address: 'Tiong Bahru',
  lat: 1.2862,
  lng: 103.8326,
  state: 'targeted',
  source: 'catalog',
  created_at: '2026-11-01T10:00:00.000Z',
  updated_at: '2026-11-01T10:00:00.000Z',
  conquered_at: null,
  ...over,
})

function seed(spots: Spot[]) {
  localStorage.setItem('wwe.spots', JSON.stringify(spots))
}

beforeEach(() => {
  localStorage.clear()
  reset_spots_store_for_test()
})

const setup = () =>
  render(
    <MemoryRouter>
      <Spots />
    </MemoryRouter>,
  )

test('with nothing recorded it explains how to start, in the Targets tab', () => {
  setup()
  expect(screen.getByRole('heading', { level: 1, name: 'Spots' })).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'Targets 0' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByText(/Tap the crosshair on a place/)).toBeInTheDocument()
})

test('the two tabs show how many Targets and Conquered Spots there are', () => {
  seed([
    make({}),
    make({ id: 'r:a', place_id: 'a', name: 'Alpha' }),
    make({ id: 'r:b', place_id: 'b', name: 'Beta', state: 'conquered', conquered_at: '2026-11-01T11:00:00.000Z' }),
  ])
  setup()
  expect(screen.getByRole('tab', { name: 'Targets 2' })).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'Conquered 1' })).toBeInTheDocument()
})

test('the Targets tab lists only Targets, and the Conquered tab lists only Conquered Spots', async () => {
  seed([make({}), make({ id: 'r:b', place_id: 'b', name: 'Beta', state: 'conquered', conquered_at: '2026-11-01T11:00:00.000Z' })])
  setup()
  expect(screen.getByText('Kopi & Kin')).toBeInTheDocument()
  expect(screen.queryByText('Beta')).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('tab', { name: 'Conquered 1' }))
  expect(screen.getByText('Beta')).toBeInTheDocument()
  expect(screen.queryByText('Kopi & Kin')).not.toBeInTheDocument()
})

test('Conquer moves a Target into the Conquered tab', async () => {
  seed([make({})])
  setup()
  await userEvent.click(screen.getByRole('button', { name: 'Conquer Kopi & Kin' }))
  expect(screen.getByRole('tab', { name: 'Targets 0' })).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'Conquered 1' })).toBeInTheDocument()
})

test('Back to Targets moves a Conquered Spot back', async () => {
  seed([make({ state: 'conquered', conquered_at: '2026-11-01T11:00:00.000Z' })])
  setup()
  await userEvent.click(screen.getByRole('tab', { name: 'Conquered 1' }))
  await userEvent.click(screen.getByRole('button', { name: 'Move Kopi & Kin back to Targets' }))
  expect(screen.getByRole('tab', { name: 'Targets 1' })).toBeInTheDocument()
})

test('Remove deletes a spot', async () => {
  seed([make({})])
  setup()
  await userEvent.click(screen.getByRole('button', { name: 'Remove Kopi & Kin' }))
  expect(screen.queryByText('Kopi & Kin')).not.toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'Targets 0' })).toBeInTheDocument()
})

test('an empty Conquered tab tells people how to get something into it', async () => {
  seed([make({})])
  setup()
  await userEvent.click(screen.getByRole('tab', { name: 'Conquered 0' }))
  expect(screen.getByText(/Nothing conquered yet/)).toBeInTheDocument()
})

test('a Conquered Spot shows the day it was conquered', async () => {
  seed([make({ state: 'conquered', conquered_at: '2026-11-01T11:00:00.000Z' })])
  setup()
  await userEvent.click(screen.getByRole('tab', { name: 'Conquered 1' }))
  const row = screen.getByText('Kopi & Kin').closest('li')!
  expect(within(row).getByText(/1 Nov 2026/)).toBeInTheDocument()
})

test('Conquered uses a flag icon everywhere on the screen, and nothing uses a stamp', async () => {
  seed([make({}), make({ id: 'r:b', place_id: 'b', name: 'Beta', state: 'conquered', conquered_at: '2026-11-01T11:00:00.000Z' })])
  const { container } = setup()
  expect(screen.getByRole('tab', { name: 'Conquered 1' }).querySelector('svg.lucide-flag')).not.toBeNull()
  expect(screen.getByRole('button', { name: 'Conquer Kopi & Kin' }).querySelector('svg.lucide-flag')).not.toBeNull()
  expect(container.querySelector('svg.lucide-stamp')).toBeNull()
})

test('the Spots screen has an Add button that opens Add a spot', () => {
  setup()
  expect(screen.getByRole('link', { name: 'Add a spot' })).toHaveAttribute('href', '/add')
})

test('shows a plain notice when spots could not be saved to the account, and nothing otherwise', () => {
  const { unmount } = setup()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  unmount()
  report_sync_problem(new Error('boom'))
  setup()
  expect(screen.getByRole('status')).toHaveTextContent(/still saved on this device/i)
})
