import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { RestaurantCard } from './RestaurantCard'
import type { Restaurant } from '../../domain/types'

const r: Restaurant = {
  id: 'kopi-kin',
  name: 'Kopi & Kin',
  area: 'Tiong Bahru',
  lat: 1.28,
  lng: 103.83,
  priceBand: 2,
  cuisine: 'Cafe',
  tags: ['small', 'halal'],
  closed: false,
}

function setup(over: Partial<Parameters<typeof RestaurantCard>[0]> = {}) {
  const props = { r, saved: false, inShortlist: false, onSave: vi.fn(), onToggleShortlist: vi.fn(), ...over }
  render(
    <MemoryRouter>
      <RestaurantCard {...props} />
    </MemoryRouter>,
  )
  return props
}

test('the restaurant name links to its page', () => {
  setup()
  expect(screen.getByRole('link', { name: 'Kopi & Kin' })).toHaveAttribute('href', '/r/kopi-kin')
})

test('shows the name, area, price band, cuisine icon and tag labels', () => {
  setup()
  expect(screen.getByText('Kopi & Kin')).toBeInTheDocument()
  expect(screen.getByText(/Tiong Bahru/)).toBeInTheDocument()
  expect(screen.getByText(/\$\$/)).toBeInTheDocument()
  expect(screen.getByText('☕')).toBeInTheDocument()
  expect(screen.getByText('Halal')).toBeInTheDocument()
})

test('the heart button saves and the plus button toggles the shortlist', async () => {
  const props = setup()
  await userEvent.click(screen.getByRole('button', { name: 'Save Kopi & Kin' }))
  expect(props.onSave).toHaveBeenCalledOnce()
  await userEvent.click(screen.getByRole('button', { name: 'Add Kopi & Kin to shortlist' }))
  expect(props.onToggleShortlist).toHaveBeenCalledOnce()
})

test('saved and shortlisted state changes the button labels', () => {
  setup({ saved: true, inShortlist: true })
  expect(screen.getByRole('button', { name: 'Unsave Kopi & Kin' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: 'Remove Kopi & Kin from shortlist' })).toBeInTheDocument()
})
