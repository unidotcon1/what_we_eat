import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Vote from './Vote'
import { listMyPolls } from '../../data/polls'
import { resetStoresForTest } from '../../local/store'

beforeEach(() => {
  localStorage.clear()
  resetStoresForTest()
})

const setup = () =>
  render(
    <MemoryRouter>
      <Vote />
    </MemoryRouter>,
  )

test('with an empty draft it explains how to start a shortlist', async () => {
  setup()
  expect(await screen.findByText(/Tap Start a vote on Explore/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Send to friends' })).not.toBeInTheDocument()
})

test('the draft lists the shortlisted restaurants and can drop one', async () => {
  localStorage.setItem('wwe.shortlist', JSON.stringify(['kopi-kin', 'long-table-hotpot']))
  setup()
  expect(await screen.findByText('Kopi & Kin')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Remove Kopi & Kin' }))
  expect(screen.queryByText('Kopi & Kin')).not.toBeInTheDocument()
})

test('Send to friends needs at least two places', async () => {
  localStorage.setItem('wwe.shortlist', JSON.stringify(['kopi-kin']))
  setup()
  expect(await screen.findByRole('button', { name: 'Send to friends' })).toBeDisabled()
})

test('Send to friends creates a poll, shows WhatsApp and Telegram links and remembers it', async () => {
  localStorage.setItem('wwe.shortlist', JSON.stringify(['kopi-kin', 'long-table-hotpot']))
  setup()
  await userEvent.click(await screen.findByRole('button', { name: 'Send to friends' }))
  const wa = await screen.findByRole('link', { name: /WhatsApp/ })
  const tg = screen.getByRole('link', { name: /Telegram/ })
  expect(wa.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/\?text=/)
  expect(tg.getAttribute('href')).toMatch(/^https:\/\/t\.me\/share\/url\?url=/)
  expect(decodeURIComponent(wa.getAttribute('href')!)).toContain('/p/')
  expect(listMyPolls()).toHaveLength(1)
  expect(listMyPolls()[0].role).toBe('created')
})

test('my polls are listed with links to open them', async () => {
  localStorage.setItem('wwe.mypolls', JSON.stringify([{ code: 'abc123', title: 'Friday dinner', role: 'created' }]))
  setup()
  const section = await screen.findByRole('region', { name: 'My polls' })
  expect(within(section).getByRole('link', { name: /Friday dinner/ })).toHaveAttribute('href', '/p/abc123')
})
