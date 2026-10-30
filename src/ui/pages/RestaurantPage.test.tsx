import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import RestaurantPage from './RestaurantPage'
import * as reviews from '../../data/reviews'
import * as auth from '../../data/auth'

vi.mock('../../data/reviews')
vi.mock('../../data/auth')

beforeEach(() => {
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
