import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Explore from './Explore'
import { resetStoresForTest } from '../../local/store'
import { reset_spots_store_for_test } from '../../local/spots_store'
import { reset_explore_view_for_test } from '../../local/explore_view'

beforeEach(() => {
  localStorage.clear()
  resetStoresForTest()
  reset_spots_store_for_test()
  reset_explore_view_for_test()
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

test('press and hold on a card, then Conquer, makes it a Conquered Spot', async () => {
  setup()
  await screen.findByText('Long Table Hotpot')
  vi.useFakeTimers({ shouldAdvanceTime: true })
  try {
    const btn = screen.getByRole('button', { name: 'Target Kopi & Kin' })
    fireEvent.pointerDown(btn)
    act(() => {
      vi.advanceTimersByTime(700)
    })
    fireEvent.pointerUp(btn)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Conquer Kopi & Kin' }))
  } finally {
    vi.useRealTimers()
  }
  expect(await screen.findByRole('button', { name: 'Move Kopi & Kin back to Targets' })).toBeInTheDocument()
  expect(screen.getByText('Conquered')).toBeInTheDocument()
})

describe('the refreshed Explore screen', () => {
  const chips = () => screen.getByRole('group', { name: 'Quick filters' })

  test('while the places load, a skeleton of the same shape shows, then goes away', async () => {
    setup()
    expect(screen.getByLabelText('Loading places')).toHaveAttribute('aria-busy', 'true')
    await screen.findByText('Long Table Hotpot')
    expect(screen.queryByLabelText('Loading places')).not.toBeInTheDocument()
  })

  test('there is one quick-filter row: Date night, Big group, Open now, Halal, then Filters', async () => {
    setup()
    await screen.findByText('Long Table Hotpot')
    const names = within(chips())
      .getAllByRole('button')
      .map((b) => b.textContent?.trim())
    expect(names).toEqual(['Date night', 'Big group', 'Open now', 'Halal', 'Filters'])
  })

  test('Date night narrows the list to date places and pressing it again restores everything', async () => {
    setup()
    await screen.findByText('Long Table Hotpot')
    const date = within(chips()).getByRole('button', { name: 'Date night' })
    expect(date).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(date)
    expect(date).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Candlelight Bistro')).toBeInTheDocument()
    expect(screen.queryByText('Long Table Hotpot')).not.toBeInTheDocument()
    await userEvent.click(date)
    expect(await screen.findByText('Long Table Hotpot')).toBeInTheDocument()
  })

  test('a quick filter is shown by its chip only: no duplicate removable tag and no count on Filters', async () => {
    setup()
    await screen.findByText('Long Table Hotpot')
    await userEvent.click(within(chips()).getByRole('button', { name: 'Halal' }))
    expect(screen.queryByRole('button', { name: 'Remove filter Halal' })).not.toBeInTheDocument()
    expect(within(chips()).getByRole('button', { name: 'Filters' })).toBeInTheDocument()
  })

  test('the first result is the one hero card and the rest are ordinary rows', async () => {
    setup()
    await screen.findByText('Long Table Hotpot')
    const cards = document.querySelectorAll('article.card')
    expect(cards.length).toBeGreaterThan(5)
    expect(document.querySelectorAll('article.card-hero')).toHaveLength(1)
    expect(cards[0]).toHaveClass('card-hero')
  })

  test('sort is a quiet text control that says what it does and flips between nearest and cheapest', async () => {
    setup()
    await screen.findByText('Long Table Hotpot')
    const sort = screen.getByRole('button', { name: /^Sort: nearest first/i })
    await userEvent.click(sort)
    expect(screen.getByRole('button', { name: /^Sort: cheapest first/i })).toBeInTheDocument()
    const first = document.querySelector('article.card-hero')!
    expect(first.textContent).toMatch(/·\s\$(?!\$)/)
  })

  test('the header has the one cherry-filled action, Start a vote', async () => {
    setup()
    await screen.findByText('Long Table Hotpot')
    expect(screen.getByRole('button', { name: 'Start a vote' })).toHaveClass('cta')
  })
})

describe('the image version of Explore', () => {
  beforeEach(() => localStorage.setItem('wwe.explore_view', 'images'))
  afterEach(() => localStorage.removeItem('wwe.explore_view'))
  beforeEach(() => reset_explore_view_for_test())

  test('one hero poster on top, then titled rows of identical posters', async () => {
    setup()
    await screen.findAllByRole('region')
    expect(document.querySelectorAll('article.poster-hero')).toHaveLength(1)
    expect(document.querySelector('article.card')).toBeNull() // no list cards in this layout
    const rows = screen.getAllByRole('region').map((s) => s.getAttribute('aria-label'))
    expect(rows[0]).toBe('Near you')
    expect(rows).toContain('Date night')
    expect(rows.length).toBeLessThanOrEqual(5)
  })

  test('a row is only shown when it has at least three places', async () => {
    setup()
    await screen.findAllByRole('region')
    for (const region of screen.getAllByRole('region')) {
      expect(region.querySelectorAll('article.poster').length).toBeGreaterThanOrEqual(3)
    }
  })

  test('View more on Date night turns on that filter and shows a plain poster grid of just those places', async () => {
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'View more Date night' }))
    expect(within(screen.getByRole('group', { name: 'Quick filters' })).getByRole('button', { name: 'Date night' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryAllByRole('region')).toHaveLength(0)
    expect(document.querySelector('.poster-grid')).not.toBeNull()
    expect(screen.queryByText('Long Table Hotpot')).not.toBeInTheDocument()
  })

  test('searching shows the grid too, not rows', async () => {
    setup()
    await screen.findAllByRole('region')
    await userEvent.type(screen.getByPlaceholderText(/Search restaurant/), 'hotpot')
    await waitFor(() => expect(document.querySelector('.poster-grid')).not.toBeNull())
    expect(screen.getByText('Long Table Hotpot')).toBeInTheDocument()
  })

  test('the Target button on a poster makes the place a Target', async () => {
    setup()
    await screen.findAllByRole('region')
    await userEvent.click(screen.getAllByRole('button', { name: /^Target / })[0])
    expect(screen.getAllByRole('button', { name: /^Remove .* from Targets$/ }).length).toBeGreaterThan(0)
  })

  test('Start a vote works here too: posters get a pick toggle', async () => {
    setup()
    await screen.findAllByRole('region')
    await userEvent.click(screen.getByRole('button', { name: 'Start a vote' }))
    expect(screen.getAllByRole('button', { name: /^Pick .* for the vote$/ }).length).toBeGreaterThan(3)
  })

  test('while loading, the skeleton has the poster shapes, not list rows', () => {
    setup()
    const sk = screen.getByLabelText('Loading places')
    expect(sk.querySelector('.sk-poster')).not.toBeNull()
  })
})

test('the detailed list is still the default', async () => {
  setup()
  await screen.findByText('Long Table Hotpot')
  expect(document.querySelector('article.poster')).toBeNull()
  expect(document.querySelector('article.card')).not.toBeNull()
})
