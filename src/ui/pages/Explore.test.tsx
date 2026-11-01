import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Explore from './Explore'
import { resetStoresForTest } from '../../local/store'
import { reset_spots_store_for_test } from '../../local/spots_store'

beforeEach(() => {
  localStorage.clear()
  resetStoresForTest()
  reset_spots_store_for_test()
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

test('the header has no List/Map toggle: the map has its own tab', async () => {
  setup()
  await screen.findByText('Long Table Hotpot')
  expect(screen.queryByRole('button', { name: 'Map' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'List' })).not.toBeInTheDocument()
})

test('each card has one Target button, and pressing it makes the place a Target', async () => {
  setup()
  await screen.findByText('Long Table Hotpot')
  expect(screen.queryByRole('button', { name: /to shortlist/ })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Target Kopi & Kin' }))
  expect(await screen.findByRole('button', { name: 'Remove Kopi & Kin from Targets' })).toHaveAttribute('aria-pressed', 'true')
})

test('Start a vote switches the cards to picking, and sending needs at least two places', async () => {
  setup()
  await screen.findByText('Long Table Hotpot')
  await userEvent.click(screen.getByRole('button', { name: 'Start a vote' }))
  expect(screen.queryByRole('button', { name: /^Target / })).not.toBeInTheDocument()
  expect(screen.getByText('Pick at least 2 places')).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: 'Pick Kopi & Kin for the vote' }))
  expect(screen.getByText('Pick at least 2 places')).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: 'Pick Long Table Hotpot for the vote' }))
  const send = screen.getByRole('link', { name: 'Send 2 to friends' })
  expect(send).toHaveAttribute('href', '/vote')
})

test('Cancel leaves picking and brings the Target buttons back', async () => {
  setup()
  await screen.findByText('Long Table Hotpot')
  await userEvent.click(screen.getByRole('button', { name: 'Start a vote' }))
  await userEvent.click(screen.getByRole('button', { name: 'Cancel vote' }))
  expect(screen.getByRole('button', { name: 'Target Kopi & Kin' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Start a vote' })).toBeInTheDocument()
})

test('there is no + button in the header: the search bar already finds places', async () => {
  setup()
  await screen.findByText('Long Table Hotpot')
  expect(screen.queryByRole('link', { name: 'Add a spot' })).not.toBeInTheDocument()
})
