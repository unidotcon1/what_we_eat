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
