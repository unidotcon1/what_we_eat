import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Me from './Me'
import * as auth from '../../data/auth'
import { reset_explore_view_for_test } from '../../local/explore_view'
import { reset_spots_store_for_test } from '../../local/spots_store'

vi.mock('../../data/auth')

const mocked = vi.mocked(auth)

beforeEach(() => {
  localStorage.clear()
  reset_spots_store_for_test()
  reset_explore_view_for_test()
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

const signed_in = () => mocked.useUser.mockReturnValue({ user: { id: 'u', email: 'a@b.sg' }, ready: true })

const seed_spots = (spots: { place_id: string | null; state: 'targeted' | 'conquered' }[]) =>
  localStorage.setItem(
    'wwe.spots',
    JSON.stringify(
      spots.map((s, i) => ({
        id: `r:${i}`,
        place_id: s.place_id,
        name: `Place ${i}`,
        address: '',
        lat: 1.3,
        lng: 103.8,
        state: s.state,
        source: 'catalog',
        created_at: '2026-11-01T10:00:00.000Z',
        updated_at: '2026-11-01T10:00:00.000Z',
        conquered_at: s.state === 'conquered' ? '2026-11-01T10:00:00.000Z' : null,
      })),
    ),
  )

test('the page is called Profile', () => {
  setup()
  expect(screen.getByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument()
})

describe('the hero: one big ring of Conquered Spots', () => {
  test('shows Conquered N of the places in our list, even when signed out', async () => {
    seed_spots([
      { place_id: 'kopi-kin', state: 'conquered' },
      { place_id: 'long-table-hotpot', state: 'targeted' },
    ])
    setup()
    expect(await screen.findByRole('img', { name: 'Conquered 1 of 25' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Conquered 1 of 25' })).toBeInTheDocument()
  })

  test('a Conquered Spot that is not in our list does not count toward the 25', async () => {
    seed_spots([{ place_id: null, state: 'conquered' }])
    setup()
    expect(await screen.findByRole('img', { name: 'Conquered 0 of 25' })).toBeInTheDocument()
  })

  test('signed out there is no level pill and no points line', async () => {
    setup()
    await screen.findByRole('img', { name: /Conquered/ })
    expect(screen.queryByText(/^Lv \d/)).not.toBeInTheDocument()
    expect(screen.queryByText(/points to/)).not.toBeInTheDocument()
  })

  test('signed in: a level pill and the points still to go to the next level', async () => {
    signed_in()
    setup()
    expect(await screen.findByText('Lv 2')).toBeInTheDocument()
    expect(screen.getByText('Food Explorer')).toBeInTheDocument()
    expect(screen.getByText('58 points to Regular')).toBeInTheDocument()
  })

  test('at the top level there is no next level, so it just shows the points', async () => {
    signed_in()
    mocked.fetchMyStats.mockResolvedValue({ points: 450, saves: 0, reviews: 0 })
    setup()
    expect(await screen.findByText('450 points')).toBeInTheDocument()
    expect(screen.getByText('Lv 4')).toBeInTheDocument()
    expect(screen.queryByText(/points to/)).not.toBeInTheDocument()
  })

  test('the old counts grid and Reviews count are gone', async () => {
    signed_in()
    setup()
    await screen.findByText('Lv 2')
    expect(screen.queryByText('Targets')).not.toBeInTheDocument()
    expect(screen.queryByText('Reviews')).not.toBeInTheDocument()
    expect(screen.queryByText('Saved places')).not.toBeInTheDocument()
  })
})

describe('the menu card', () => {
  test('one grouped card holds Import, the Explore view choice, the Dark mode switch and Sign out, in that order', async () => {
    signed_in()
    setup()
    const card = await screen.findByRole('list', { name: 'Profile menu' })
    const rows = within(card)
      .getAllByRole('listitem')
      .map((li) => li.textContent?.trim())
    expect(rows).toEqual(['Import from Google Maps', 'Explore viewDetailsImages', 'Dark mode', 'Sign out'])
  })

  test('signed out the card has Import and Dark mode, and no Sign out', () => {
    setup()
    const card = screen.getByRole('list', { name: 'Profile menu' })
    const rows = within(card)
      .getAllByRole('listitem')
      .map((li) => li.textContent?.trim())
    expect(rows).toEqual(['Import from Google Maps', 'Explore viewDetailsImages', 'Dark mode'])
  })

  test('Import opens the import screen', () => {
    setup()
    expect(screen.getByRole('link', { name: /Import from Google Maps/ })).toHaveAttribute('href', '/import')
  })

  test('Dark mode is a switch: on by default, and pressing it turns it off and remembers light', async () => {
    setup()
    const sw = screen.getByRole('switch', { name: 'Dark mode' })
    expect(sw).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(sw)
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(localStorage.getItem('wwe.theme')).toBe('light')
    expect(sw).toHaveAttribute('aria-checked', 'false')
    await userEvent.click(sw)
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(sw).toHaveAttribute('aria-checked', 'true')
  })

  test('Explore view: Details is chosen by default, and picking Images saves it', async () => {
    setup()
    const group = within(screen.getByRole('radiogroup', { name: 'Explore view' }))
    expect(group.getByRole('radio', { name: 'Details' })).toHaveAttribute('aria-checked', 'true')
    expect(group.getByRole('radio', { name: 'Images' })).toHaveAttribute('aria-checked', 'false')
    await userEvent.click(group.getByRole('radio', { name: 'Images' }))
    expect(group.getByRole('radio', { name: 'Images' })).toHaveAttribute('aria-checked', 'true')
    expect(localStorage.getItem('wwe.explore_view')).toBe('images')
  })

  test('Sign out signs out', async () => {
    signed_in()
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }))
    expect(mocked.signOut).toHaveBeenCalledOnce()
  })
})

describe('signing in and out', () => {
  test('signed out: Sign in with Google is the one cherry-filled action, and it calls signInWithGoogle', async () => {
    setup()
    const button = screen.getByRole('button', { name: 'Sign in with Google' })
    expect(button).toHaveClass('cta')
    await userEvent.click(button)
    expect(mocked.signInWithGoogle).toHaveBeenCalledOnce()
  })

  test('signed in: shows which account, and says what signing out does to the Spots on this phone', async () => {
    signed_in()
    setup()
    expect(await screen.findByText('Signed in as a@b.sg')).toBeInTheDocument()
    expect(screen.getByText(/signing out clears the spots on this phone/i)).toBeInTheDocument()
  })

  test('without a database the page explains that accounts are unavailable', () => {
    mocked.accountsAvailable.mockReturnValue(false)
    setup()
    expect(screen.getByText(/Accounts need the online database/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sign in with Google' })).not.toBeInTheDocument()
  })

  test('links to the privacy policy and terms', () => {
    setup()
    expect(screen.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', '/privacy')
    expect(screen.getByRole('link', { name: 'Terms of service' })).toHaveAttribute('href', '/terms')
  })
})

describe('deleting the account', () => {
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

  test('the final button stays disabled until DELETE is typed exactly', async () => {
    signed_in()
    mocked.delete_my_account.mockResolvedValue(undefined)
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Delete my account' }))
    const final = screen.getByRole('button', { name: 'Yes, delete my account' })
    expect(final).toBeDisabled()
    await userEvent.type(screen.getByLabelText(/type DELETE/i), 'delete')
    expect(final).toBeDisabled()
    await userEvent.clear(screen.getByLabelText(/type DELETE/i))
    await userEvent.type(screen.getByLabelText(/type DELETE/i), 'DELETE')
    expect(final).toBeEnabled()
    expect(mocked.delete_my_account).not.toHaveBeenCalled()
  })

  test('confirming deletes the account and says so', async () => {
    signed_in()
    mocked.delete_my_account.mockResolvedValue(undefined)
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Delete my account' }))
    await userEvent.type(screen.getByLabelText(/type DELETE/i), 'DELETE')
    await userEvent.click(screen.getByRole('button', { name: 'Yes, delete my account' }))
    expect(mocked.delete_my_account).toHaveBeenCalledOnce()
    expect(await screen.findByText(/Your account has been deleted/)).toBeInTheDocument()
  })

  test('a failure is shown and nothing claims success', async () => {
    signed_in()
    mocked.delete_my_account.mockRejectedValue(new Error('Could not delete your account: boom'))
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Delete my account' }))
    await userEvent.type(screen.getByLabelText(/type DELETE/i), 'DELETE')
    await userEvent.click(screen.getByRole('button', { name: 'Yes, delete my account' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not delete your account: boom')
    expect(screen.queryByText(/Your account has been deleted/)).not.toBeInTheDocument()
  })
})
