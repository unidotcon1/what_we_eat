import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AddSpot from './AddSpot'
import { reset_spots_store_for_test, get_spots } from '../../local/spots_store'

beforeEach(() => {
  localStorage.clear()
  reset_spots_store_for_test()
})

const setup = () =>
  render(
    <MemoryRouter>
      <AddSpot />
    </MemoryRouter>,
  )

test('starts with a hint instead of a long list', async () => {
  setup()
  expect(await screen.findByText('Search for a place by name, area or cuisine')).toBeInTheDocument()
  expect(screen.queryByRole('article')).not.toBeInTheDocument()
})

test('typing finds places in the catalogue', async () => {
  setup()
  await userEvent.type(await screen.findByPlaceholderText('Search places'), 'kopi')
  expect(await screen.findByText('Kopi & Kin')).toBeInTheDocument()
  expect(screen.queryByText('Long Table Hotpot')).not.toBeInTheDocument()
})

test('Target adds the place as a Target', async () => {
  setup()
  await userEvent.type(await screen.findByPlaceholderText('Search places'), 'kopi')
  await userEvent.click(await screen.findByRole('button', { name: 'Add Kopi & Kin as a Target' }))
  expect(get_spots()).toHaveLength(1)
  expect(get_spots()[0]).toMatchObject({ place_id: 'kopi-kin', state: 'targeted' })
  expect(await screen.findByText('Added to Targets')).toBeInTheDocument()
})

test('Conquered adds the place as already conquered', async () => {
  setup()
  await userEvent.type(await screen.findByPlaceholderText('Search places'), 'kopi')
  await userEvent.click(await screen.findByRole('button', { name: 'Add Kopi & Kin as Conquered' }))
  expect(get_spots()[0]).toMatchObject({ place_id: 'kopi-kin', state: 'conquered' })
  expect(await screen.findByText('Added to Conquered')).toBeInTheDocument()
})

test('a place that is already a spot says so instead of offering to add it again', async () => {
  setup()
  await userEvent.type(await screen.findByPlaceholderText('Search places'), 'kopi')
  await userEvent.click(await screen.findByRole('button', { name: 'Add Kopi & Kin as a Target' }))
  expect(screen.queryByRole('button', { name: 'Add Kopi & Kin as a Target' })).not.toBeInTheDocument()
  expect(get_spots()).toHaveLength(1)
})

test('no match says so and promises that other ways to add are coming', async () => {
  setup()
  await userEvent.type(await screen.findByPlaceholderText('Search places'), 'zzzzzz')
  expect(await screen.findByText(/No places match/)).toBeInTheDocument()
})

test('the Conquered button uses a flag icon, not a stamp', async () => {
  const { container } = setup()
  await userEvent.type(await screen.findByPlaceholderText('Search places'), 'kopi')
  const button = await screen.findByRole('button', { name: 'Add Kopi & Kin as Conquered' })
  expect(button.querySelector('svg.lucide-flag')).not.toBeNull()
  expect(container.querySelector('svg.lucide-stamp')).toBeNull()
})

test('offers the Google Maps import', () => {
  setup()
  expect(screen.getByRole('link', { name: /Import from Google Maps/ })).toHaveAttribute('href', '/import')
})
