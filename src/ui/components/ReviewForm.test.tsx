import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReviewForm } from './ReviewForm'
import * as auth from '../../data/auth'
import * as reviews from '../../data/reviews'

vi.mock('../../data/auth')
vi.mock('../../data/reviews')

beforeEach(() => {
  vi.mocked(auth.useUser).mockReturnValue({ user: { id: 'u', email: 'a@b.sg' }, ready: true })
  vi.mocked(reviews.submitReviewForCurrentClient).mockResolvedValue(undefined)
})

test('signed out: asks the user to sign in instead of showing the form', () => {
  vi.mocked(auth.useUser).mockReturnValue({ user: null, ready: true })
  render(<ReviewForm restaurantId="kopi-kin" />)
  expect(screen.getByText('Sign in to write a review')).toBeInTheDocument()
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
})

test('submitting a 5 star review sends it and says it awaits approval', async () => {
  render(<ReviewForm restaurantId="kopi-kin" />)
  await userEvent.click(screen.getByRole('button', { name: '5 stars' }))
  await userEvent.type(screen.getByRole('textbox', { name: 'Your review' }), 'Great')
  await userEvent.click(screen.getByRole('button', { name: 'Submit review' }))
  expect(reviews.submitReviewForCurrentClient).toHaveBeenCalledWith('kopi-kin', 5, 'Great')
  expect(await screen.findByText(/waiting for approval/)).toBeInTheDocument()
})

test('submitting without a rating shows the rating error and sends nothing', async () => {
  render(<ReviewForm restaurantId="kopi-kin" />)
  await userEvent.click(screen.getByRole('button', { name: 'Submit review' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Pick a rating from 1 to 5')
  expect(reviews.submitReviewForCurrentClient).not.toHaveBeenCalled()
})

test('a 281 character review shows the limit error and sends nothing', async () => {
  render(<ReviewForm restaurantId="kopi-kin" />)
  await userEvent.click(screen.getByRole('button', { name: '4 stars' }))
  await userEvent.click(screen.getByRole('textbox', { name: 'Your review' }))
  await userEvent.paste('a'.repeat(281))
  await userEvent.click(screen.getByRole('button', { name: 'Submit review' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Review must be 280 characters or fewer')
  expect(reviews.submitReviewForCurrentClient).not.toHaveBeenCalled()
})
