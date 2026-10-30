import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Me from './Me'
import * as auth from '../../data/auth'

vi.mock('../../data/auth')

const mocked = vi.mocked(auth)

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  mocked.accountsAvailable.mockReturnValue(true)
  mocked.useUser.mockReturnValue({ user: null, ready: true })
  mocked.fetchMyStats.mockResolvedValue({ points: 92, saves: 14, reviews: 6 })
  mocked.signInWithGoogle.mockResolvedValue(undefined)
  mocked.signOut.mockResolvedValue(undefined)
})

const setup = () =>
  render(
    <MemoryRouter>
      <Me />
    </MemoryRouter>,
  )

test('signed out: shows Sign in with Google and the theme toggle', () => {
  setup()
  expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Dark mode/ })).toBeInTheDocument()
})

test('clicking Sign in calls signInWithGoogle', async () => {
  setup()
  await userEvent.click(screen.getByRole('button', { name: 'Sign in with Google' }))
  expect(mocked.signInWithGoogle).toHaveBeenCalledOnce()
})

test('signed in: shows points, level progress and counts', async () => {
  mocked.useUser.mockReturnValue({ user: { id: 'u', email: 'a@b.sg' }, ready: true })
  setup()
  expect(await screen.findByText('92 / 150 points')).toBeInTheDocument()
  expect(screen.getByText(/Level 2/)).toBeInTheDocument()
  expect(screen.getByText(/Food Explorer/)).toBeInTheDocument()
  expect(screen.getByText('14')).toBeInTheDocument()
  expect(screen.getByText('6')).toBeInTheDocument()
})

test('at the top level the progress line shows the total only', async () => {
  mocked.fetchMyStats.mockResolvedValue({ points: 450, saves: 0, reviews: 0 })
  mocked.useUser.mockReturnValue({ user: { id: 'u', email: 'a@b.sg' }, ready: true })
  setup()
  expect(await screen.findByText('450 points')).toBeInTheDocument()
})

test('toggling dark mode sets data-theme on the page and remembers it', async () => {
  setup()
  await userEvent.click(screen.getByRole('button', { name: /Dark mode/ }))
  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(localStorage.getItem('wwe.theme')).toBe('dark')
  await userEvent.click(screen.getByRole('button', { name: /Dark mode/ }))
  expect(document.documentElement.dataset.theme).toBe('light')
})

test('links to the privacy policy and terms', () => {
  setup()
  expect(screen.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', '/privacy')
  expect(screen.getByRole('link', { name: 'Terms of service' })).toHaveAttribute('href', '/terms')
})

test('without a database the page explains that accounts are unavailable', () => {
  mocked.accountsAvailable.mockReturnValue(false)
  setup()
  expect(screen.getByText(/Accounts need the online database/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Sign in with Google' })).not.toBeInTheDocument()
})
