import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Explore from './Explore'
import * as loc from '../useLocation'
import { resetStoresForTest } from '../../local/store'

vi.mock('../useLocation')

const bugis = { lat: 1.3, lng: 103.8559 }
const request = vi.fn()

beforeEach(() => {
  localStorage.clear()
  resetStoresForTest()
  request.mockClear()
  vi.mocked(loc.useLocation).mockReturnValue({ status: 'idle', coords: undefined, request })
})

const setup = () =>
  render(
    <MemoryRouter>
      <Explore />
    </MemoryRouter>,
  )

async function openSheet() {
  await screen.findByText('Long Table Hotpot')
  await userEvent.click(screen.getByRole('button', { name: /^Filters/ }))
  return screen.getByRole('dialog', { name: 'Filters' })
}

test('Near me asks for the location', async () => {
  setup()
  const sheet = await openSheet()
  await userEvent.click(within(sheet).getByRole('button', { name: 'Near me' }))
  expect(request).toHaveBeenCalledOnce()
})

test('when permission is denied the sheet says so and points to the area picker', async () => {
  vi.mocked(loc.useLocation).mockReturnValue({ status: 'denied', coords: undefined, request })
  setup()
  const sheet = await openSheet()
  expect(within(sheet).getByText(/Location is off/)).toBeInTheDocument()
  expect(within(sheet).getByRole('button', { name: 'Bugis' })).toBeInTheDocument()
})

test('with a location, the distance slider limits results to places within range', async () => {
  vi.mocked(loc.useLocation).mockReturnValue({ status: 'granted', coords: bugis, request })
  setup()
  const sheet = await openSheet()
  fireEvent.change(within(sheet).getByLabelText('Distance (km)'), { target: { value: '1' } })
  await waitFor(() => expect(within(sheet).getByRole('button', { name: /^Show \d+ places$/ })).toBeInTheDocument())
  await userEvent.click(within(sheet).getByRole('button', { name: /^Show/ }))
  expect(screen.getByRole('button', { name: 'Remove filter 1 km' })).toBeInTheDocument()
  expect(screen.getByText('Long Table Hotpot')).toBeInTheDocument()
  expect(screen.queryByText('Kopi & Kin')).not.toBeInTheDocument()
})

test('the Map toggle shows a pin per result and List switches back', async () => {
  setup()
  await screen.findByText('Long Table Hotpot')
  await userEvent.click(screen.getByRole('button', { name: 'Map' }))
  expect(screen.getByRole('region', { name: 'Map' })).toBeInTheDocument()
  expect(screen.getAllByTitle(/./).length).toBeGreaterThan(5)
  await userEvent.click(screen.getByRole('button', { name: 'List' }))
  expect(screen.queryByRole('region', { name: 'Map' })).not.toBeInTheDocument()
})
