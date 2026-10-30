import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Saved from './Saved'
import { resetStoresForTest } from '../../local/store'

beforeEach(() => {
  localStorage.clear()
  resetStoresForTest()
})

const setup = () =>
  render(
    <MemoryRouter>
      <Saved />
    </MemoryRouter>,
  )

test('shows an empty message when nothing is saved', async () => {
  setup()
  expect(await screen.findByText('Nothing saved yet')).toBeInTheDocument()
})

test('lists only the saved restaurants', async () => {
  localStorage.setItem('wwe.saves', JSON.stringify(['kopi-kin']))
  setup()
  expect(await screen.findByText('Kopi & Kin')).toBeInTheDocument()
  expect(screen.queryByText('Long Table Hotpot')).not.toBeInTheDocument()
})

test('unsaving removes the restaurant from the list', async () => {
  localStorage.setItem('wwe.saves', JSON.stringify(['kopi-kin']))
  setup()
  await userEvent.click(await screen.findByRole('button', { name: 'Unsave Kopi & Kin' }))
  expect(await screen.findByText('Nothing saved yet')).toBeInTheDocument()
})
