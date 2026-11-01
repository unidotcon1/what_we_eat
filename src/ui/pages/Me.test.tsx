import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Me from './Me'
import * as auth from '../../data/auth'
import { reset_spots_store_for_test } from '../../local/spots_store'

vi.mock('../../data/auth')

const mocked = vi.mocked(auth)

beforeEach(() => {
  localStorage.clear()
  reset_spots_store_for_test()
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

test('the page is called Profile', () => {
  setup()
  expect(screen.getByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument()
})

test('shows how many Targets and Conquered Spots there are, even when signed out', () => {
  const base = { source: 'catalog', created_at: '2026-11-01T10:00:00.000Z', updated_at: '2026-11-01T10:00:00.000Z', address: '', lat: 1.3, lng: 103.8 }
  localStorage.setItem(
    'wwe.spots',
    JSON.stringify([
      { ...base, id: 'r:a', place_id: 'a', name: 'A', state: 'targeted', conquered_at: null },
      { ...base, id: 'r:b', place_id: 'b', name: 'B', state: 'targeted', conquered_at: null },
      { ...base, id: 'r:c', place_id: 'c', name: 'C', state: 'conquered', conquered_at: '2026-11-01T10:00:00.000Z' },
    ]),
  )
  setup()
  const targets = screen.getByText('Targets').closest('div')!
  const conquered = screen.getByText('Conquered').closest('div')!
  expect(targets).toHaveTextContent('2')
  expect(conquered).toHaveTextContent('1')
})

test('the old "Saved places" count is gone', async () => {
  mocked.useUser.mockReturnValue({ user: { id: 'u', email: 'a@b.sg' }, ready: true })
  setup()
  await screen.findByText('92 / 150 points')
  expect(screen.queryByText('Saved places')).not.toBeInTheDocument()
})

describe('deleting the account', () => {
  const signed_in = () => mocked.useUser.mockReturnValue({ user: { id: 'u', email: 'a@b.sg' }, ready: true })

  test('the delete button is only shown when signed in', () => {
    setup()
    expect(screen.queryByRole('button', { name: 'Delete my account' })).not.toBeInTheDocument()
  })

  test('pressing it asks for confirmation first and deletes nothing yet', async () => {
    signed_in()
    mocked.delete_my_account.mockResolvedValue(undefined)
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Delete my account' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent(/cannot be undone/i)
    expect(screen.getByRole('alertdialog')).toHaveTextContent(/stay on this phone/i)
    expect(mocked.delete_my_account).not.toHaveBeenCalled()
  })

  test('Cancel closes the confirmation without deleting', async () => {
    signed_in()
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Delete my account' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(mocked.delete_my_account).not.toHaveBeenCalled()
  })

  test('confirming deletes the account and says so', async () => {
    signed_in()
    mocked.delete_my_account.mockResolvedValue(undefined)
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Delete my account' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes, delete my account' }))
    expect(mocked.delete_my_account).toHaveBeenCalledOnce()
    expect(await screen.findByText(/Your account has been deleted/)).toBeInTheDocument()
  })

  test('a failure is shown and nothing claims success', async () => {
    signed_in()
    mocked.delete_my_account.mockRejectedValue(new Error('Could not delete your account: boom'))
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Delete my account' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes, delete my account' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not delete your account: boom')
    expect(screen.queryByText(/Your account has been deleted/)).not.toBeInTheDocument()
  })
})
