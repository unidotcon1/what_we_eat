import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import RestaurantPage from './RestaurantPage'
import * as reviews from '../../data/reviews'
import * as auth from '../../data/auth'
import { reset_spots_store_for_test } from '../../local/spots_store'
import { reset_travel_mode_for_test } from '../../local/travel_mode'

vi.mock('../../data/reviews')
vi.mock('../../data/auth')

beforeEach(() => {
  localStorage.clear()
  reset_spots_store_for_test()
  reset_travel_mode_for_test()
  vi.mocked(auth.accountsAvailable).mockReturnValue(true)
  vi.mocked(auth.useUser).mockReturnValue({ user: null, ready: true })
  vi.mocked(reviews.fetchApprovedReviews).mockResolvedValue([{ id: '1', rating: 5, body: 'Lovely kopi' }])
})

const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/r/:id" element={<RestaurantPage />} />
      </Routes>
    </MemoryRouter>,
  )

test('shows the restaurant details and its approved reviews', async () => {
  at('/r/kopi-kin')
  expect(await screen.findByRole('heading', { name: 'Kopi & Kin' })).toBeInTheDocument()
  expect(await screen.findByText('Lovely kopi')).toBeInTheDocument()
})

test('shows the review form prompt for signed-out visitors', async () => {
  at('/r/kopi-kin')
  expect(await screen.findByText('Sign in to write a review')).toBeInTheDocument()
})

test('says there are no reviews yet when there are none', async () => {
  vi.mocked(reviews.fetchApprovedReviews).mockResolvedValue([])
  at('/r/kopi-kin')
  expect(await screen.findByText('No reviews yet')).toBeInTheDocument()
})

test('an unknown restaurant id shows a not-found message', async () => {
  at('/r/does-not-exist')
  expect(await screen.findByText('Restaurant not found')).toBeInTheDocument()
})

describe('the refreshed details page', () => {
  test('has a picture slot at the top: the drawn placeholder until the place has a photo', async () => {
    at('/r/kopi-kin')
    await screen.findByRole('heading', { name: 'Kopi & Kin' })
    expect(document.querySelector('.detail-art .poster-art')).not.toBeNull()
  })

  test('Target and Conquer work from here: Target, then Conquer, then back to Targets', async () => {
    at('/r/kopi-kin')
    await userEvent.click(await screen.findByRole('button', { name: 'Target Kopi & Kin' }))
    expect(screen.getByRole('button', { name: 'Remove Kopi & Kin from Targets' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Conquer Kopi & Kin' }))
    expect(screen.getByRole('button', { name: 'Move Kopi & Kin back to Targets' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Conquer Kopi & Kin' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Move Kopi & Kin back to Targets' }))
    expect(screen.getByRole('button', { name: 'Remove Kopi & Kin from Targets' })).toBeInTheDocument()
  })

  test('Directions is the one cherry button and opens Google Maps at the exact place in a new tab', async () => {
    at('/r/kopi-kin')
    const link = await screen.findByRole('link', { name: 'Directions' })
    expect(link).toHaveClass('cta')
    const url = new URL(link.getAttribute('href')!)
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/')
    expect(url.searchParams.get('destination')).toBe('1.2862,103.8326')
    expect(url.searchParams.get('travelmode')).toBe('transit')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  test('the travel mode is a choice of Walk, Transit or Drive, and the link follows it and remembers it', async () => {
    at('/r/kopi-kin')
    const modes = within(await screen.findByRole('radiogroup', { name: 'How are you getting there?' }))
    expect(modes.getByRole('radio', { name: 'Transit' })).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(modes.getByRole('radio', { name: 'Walk' }))
    expect(modes.getByRole('radio', { name: 'Walk' })).toHaveAttribute('aria-checked', 'true')
    const url = new URL(screen.getByRole('link', { name: 'Directions' }).getAttribute('href')!)
    expect(url.searchParams.get('travelmode')).toBe('walking')
    expect(url.searchParams.get('dir_action')).toBe('navigate')
    expect(localStorage.getItem('wwe.travel_mode')).toBe('walking')
  })

  test('there is a Menu section, which says so plainly when the place has none yet', async () => {
    at('/r/kopi-kin')
    expect(await screen.findByRole('heading', { level: 2, name: 'Menu' })).toBeInTheDocument()
    expect(screen.getByText('Menu not added yet')).toBeInTheDocument()
  })

  test('the sections come in a sensible order: picture, actions, menu, then reviews', async () => {
    at('/r/kopi-kin')
    const menu = await screen.findByRole('heading', { level: 2, name: 'Menu' })
    const reviews = screen.getByRole('heading', { level: 2, name: 'Reviews' })
    const directions = screen.getByRole('link', { name: 'Directions' })
    expect(directions.compareDocumentPosition(menu) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(menu.compareDocumentPosition(reviews) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
