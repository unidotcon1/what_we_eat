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
  tags: ['small', 'halal', 'quiet', 'late'],
  closed: false,
}

function setup(over: Partial<Parameters<typeof RestaurantCard>[0]> = {}) {
  const props = { r, state: undefined, on_target: vi.fn(), picking: false, picked: false, on_pick: vi.fn(), ...over }
  render(
    <MemoryRouter>
      <RestaurantCard {...props} />
    </MemoryRouter>,
  )
  return props
}

test('shows the name, area, price band and cuisine icon', () => {
  setup()
  expect(screen.getByText('Kopi & Kin')).toBeInTheDocument()
  expect(screen.getByText(/Tiong Bahru/)).toBeInTheDocument()
  expect(screen.getByText(/\$\$/)).toBeInTheDocument()
  expect(screen.getByText('☕')).toBeInTheDocument()
})

test('the name links to the place page', () => {
  setup()
  expect(screen.getByRole('link', { name: 'Kopi & Kin' })).toHaveAttribute('href', '/r/kopi-kin')
})

test('shows at most two tags so the card stays tidy', () => {
  setup()
  expect(screen.getByText('Small groups')).toBeInTheDocument()
  expect(screen.getByText('Halal')).toBeInTheDocument()
  expect(screen.queryByText('Quiet')).not.toBeInTheDocument()
  expect(screen.queryByText('Open late')).not.toBeInTheDocument()
})

test('there is exactly one action button on a normal card: the crosshair Target button', async () => {
  const props = setup()
  expect(screen.getAllByRole('button')).toHaveLength(1)
  await userEvent.click(screen.getByRole('button', { name: 'Target Kopi & Kin' }))
  expect(props.on_target).toHaveBeenCalledOnce()
})

test('a Target shows as pressed and the button offers to remove it', () => {
  setup({ state: 'targeted' })
  const button = screen.getByRole('button', { name: 'Remove Kopi & Kin from Targets' })
  expect(button).toHaveAttribute('aria-pressed', 'true')
})

test('a Conquered Spot shows a Conquered stamp and the button offers to move it back to Targets', () => {
  setup({ state: 'conquered' })
  expect(screen.getByText('Conquered')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Move Kopi & Kin back to Targets' })).toBeInTheDocument()
})

test('while picking for a vote the Target button is replaced by a pick toggle', async () => {
  const props = setup({ picking: true })
  expect(screen.queryByRole('button', { name: /Target Kopi/ })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Pick Kopi & Kin for the vote' }))
  expect(props.on_pick).toHaveBeenCalledOnce()
})

test('a picked place shows as pressed', () => {
  setup({ picking: true, picked: true })
  expect(screen.getByRole('button', { name: 'Remove Kopi & Kin from the vote' })).toHaveAttribute('aria-pressed', 'true')
})

test('Conquered is drawn with a flag icon, never a stamp', () => {
  const { container } = render(
    <MemoryRouter>
      <RestaurantCard r={r} state="conquered" on_target={vi.fn()} picking={false} picked={false} on_pick={vi.fn()} />
    </MemoryRouter>,
  )
  expect(container.querySelectorAll('svg.lucide-flag').length).toBeGreaterThanOrEqual(2)
  expect(container.querySelector('svg.lucide-stamp')).toBeNull()
})
