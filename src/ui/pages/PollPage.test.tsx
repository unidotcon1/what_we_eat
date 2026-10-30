import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import PollPage from './PollPage'
import { localPolls } from '../../data/polls'
import { getVoterToken, resetStoresForTest } from '../../local/store'

beforeEach(() => {
  localStorage.clear()
  resetStoresForTest()
})

async function open(
  ids = ['kopi-kin', 'long-table-hotpot'],
  creator = 'someone-else',
  prepare?: (code: string, optionIds: string[]) => Promise<void>,
) {
  const api = localPolls()
  const code = await api.create('Friday dinner', ids, creator)
  const view = (await api.get(code))!
  await prepare?.(code, view.options.map((o) => o.id))
  render(
    <MemoryRouter initialEntries={[`/p/${code}`]}>
      <Routes>
        <Route path="/p/:code" element={<PollPage />} />
      </Routes>
    </MemoryRouter>,
  )
  return code
}

test('shows the title and one button per restaurant, with no tab bar', async () => {
  await open()
  expect(await screen.findByText('Friday dinner')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Kopi & Kin/ })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Long Table Hotpot/ })).toBeInTheDocument()
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
})

test('tapping an option records my vote and shows it selected', async () => {
  await open()
  const btn = await screen.findByRole('button', { name: /Kopi & Kin/ })
  await userEvent.click(btn)
  expect(await screen.findByRole('button', { name: /Kopi & Kin/ })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByText('1 vote')).toBeInTheDocument()
})

test('changing my vote moves it instead of adding another', async () => {
  await open()
  await userEvent.click(await screen.findByRole('button', { name: /Kopi & Kin/ }))
  await userEvent.click(await screen.findByRole('button', { name: /Long Table Hotpot/ }))
  expect(await screen.findByRole('button', { name: /Long Table Hotpot/ })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: /Kopi & Kin/ })).toHaveAttribute('aria-pressed', 'false')
  expect(screen.queryByText('2 votes')).not.toBeInTheDocument()
})

test('a tie is shown as a tie, not a winner', async () => {
  await open(undefined, undefined, async (code, [a, b]) => {
    await localPolls().vote(code, a, 'other-1')
    await localPolls().vote(code, b, 'other-2')
  })
  expect(await screen.findByText(/It's a tie/)).toBeInTheDocument()
})

test('a closed poll says so and disables voting', async () => {
  await open(undefined, 'creator-token', async (code) => localPolls().close(code, 'creator-token'))
  expect(await screen.findByText('Voting closed')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Kopi & Kin/ })).toBeDisabled()
})

test('only the creator sees the Close voting button', async () => {
  await open(undefined, getVoterToken())
  expect(await screen.findByRole('button', { name: 'Close voting' })).toBeInTheDocument()
})

async function open_as_member(role: 'created' | 'joined') {
  const code = await localPolls().create('Friday dinner', ['kopi-kin', 'long-table-hotpot'], 'someone-else')
  localStorage.setItem('wwe.mypolls', JSON.stringify([{ code, title: 'Friday dinner', role }]))
  render(
    <MemoryRouter initialEntries={[`/p/${code}`]}>
      <Routes>
        <Route path="/p/:code" element={<PollPage />} />
        <Route path="/vote" element={<h1>Vote tab</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}

test('a poll you created or joined shows a Back button and the tab bar', async () => {
  await open_as_member('created')
  expect(await screen.findByRole('button', { name: 'Back' })).toBeInTheDocument()
  expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
})

test('a joined poll also shows the tab bar', async () => {
  await open_as_member('joined')
  expect(await screen.findByRole('navigation', { name: 'Main' })).toBeInTheDocument()
})

test('Back goes to the Vote tab when the poll was opened directly', async () => {
  await open_as_member('created')
  await userEvent.click(await screen.findByRole('button', { name: 'Back' }))
  expect(await screen.findByText('Vote tab')).toBeInTheDocument()
})

test('a stranger opening the shared link sees neither Back nor the tab bar', async () => {
  await open()
  await screen.findByText('Friday dinner')
  expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
})

test('an unknown poll code shows a not-found message', async () => {
  render(
    <MemoryRouter initialEntries={['/p/zzzzzz']}>
      <Routes>
        <Route path="/p/:code" element={<PollPage />} />
      </Routes>
    </MemoryRouter>,
  )
  expect(await screen.findByText('Poll not found')).toBeInTheDocument()
})
