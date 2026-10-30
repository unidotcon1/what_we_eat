import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Explore from './Explore'
import { resetStoresForTest } from '../../local/store'

beforeEach(() => {
  localStorage.clear()
  resetStoresForTest()
})

function setup() {
  return render(
    <MemoryRouter>
      <Explore />
    </MemoryRouter>,
  )
}

test('lists restaurants from the sample data', async () => {
  setup()
  expect(await screen.findByText('Long Table Hotpot')).toBeInTheDocument()
})

test('typing in search narrows the list', async () => {
  setup()
  await screen.findByText('Long Table Hotpot')
  await userEvent.type(screen.getByPlaceholderText(/Search restaurant/), 'hotpot')
  await waitFor(() => expect(screen.queryByText('Kopi & Kin')).not.toBeInTheDocument())
  expect(screen.getByText('Long Table Hotpot')).toBeInTheDocument()
})

test('no match shows a message and a Clear button that restores the list', async () => {
  setup()
  await screen.findByText('Long Table Hotpot')
  await userEvent.type(screen.getByPlaceholderText(/Search restaurant/), 'zzzz')
  expect(await screen.findByText('No places match')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Clear' }))
  expect(await screen.findByText('Long Table Hotpot')).toBeInTheDocument()
})

test('the filter button shows the active count and the sheet shows a live count', async () => {
  setup()
  await screen.findByText('Long Table Hotpot')
  await userEvent.click(screen.getByRole('button', { name: /^Filters/ }))
  const sheet = screen.getByRole('dialog', { name: 'Filters' })
  await userEvent.click(within(sheet).getByRole('button', { name: '$' }))
  expect(within(sheet).getByRole('button', { name: /^Show \d+ places$/ })).toBeInTheDocument()
  await userEvent.click(within(sheet).getByRole('button', { name: /^Show/ }))
  expect(screen.getByRole('button', { name: 'Filters (1)' })).toBeInTheDocument()
})

test('removing an active tag updates the list', async () => {
  setup()
  await screen.findByText('Long Table Hotpot')
  await userEvent.click(screen.getByRole('button', { name: /^Filters/ }))
  await userEvent.click(within(screen.getByRole('dialog', { name: 'Filters' })).getByRole('button', { name: '$$$$' }))
  await userEvent.click(screen.getByRole('button', { name: /^Show/ }))
  expect(screen.queryByText('Long Table Hotpot')).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Remove filter $$$$' }))
  expect(await screen.findByText('Long Table Hotpot')).toBeInTheDocument()
})
