import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MapPage from './MapPage'
import { reset_spots_store_for_test } from '../../local/spots_store'

beforeEach(() => {
  localStorage.clear()
  reset_spots_store_for_test()
})

const setup = () =>
  render(
    <MemoryRouter>
      <MapPage />
    </MemoryRouter>,
  )

test('shows the map with a pin for every place in the catalogue', async () => {
  setup()
  expect(await screen.findByRole('region', { name: 'Map' })).toBeInTheDocument()
  expect((await screen.findAllByTitle(/./)).length).toBeGreaterThan(20)
})

test('pins are drawn differently for Targets and Conquered Spots', async () => {
  const base = { source: 'catalog', created_at: '2026-11-01T10:00:00.000Z', updated_at: '2026-11-01T10:00:00.000Z', address: '', lat: 1.2862, lng: 103.8326 }
  localStorage.setItem(
    'wwe.spots',
    JSON.stringify([
      { ...base, id: 'r:kopi-kin', place_id: 'kopi-kin', name: 'Kopi & Kin', state: 'targeted', conquered_at: null },
      { ...base, id: 'r:sakura-counter', place_id: 'sakura-counter', name: 'Sakura Counter', state: 'conquered', conquered_at: '2026-11-01T10:00:00.000Z' },
    ]),
  )
  setup()
  await screen.findByRole('region', { name: 'Map' })
  await screen.findAllByTitle(/./)
  expect(document.querySelectorAll('.leaflet-marker-icon.targeted')).toHaveLength(1)
  expect(document.querySelectorAll('.leaflet-marker-icon.conquered')).toHaveLength(1)
})

test('a legend explains the three kinds of pin', async () => {
  setup()
  expect(await screen.findByText('Target')).toBeInTheDocument()
  expect(screen.getByText('Conquered')).toBeInTheDocument()
  expect(screen.getByText('Not yet')).toBeInTheDocument()
})

test('permanently closed places are not drawn, matching the Explore list', async () => {
  setup()
  await screen.findByRole('region', { name: 'Map' })
  await screen.findAllByTitle(/./)
  expect(screen.queryByTitle('Closed Down Diner')).not.toBeInTheDocument()
})
