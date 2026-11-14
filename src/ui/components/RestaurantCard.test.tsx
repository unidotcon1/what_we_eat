import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { RestaurantCard } from './RestaurantCard'
import type { Restaurant } from '../../domain/types'

const r: Restaurant = {
  id: 'kopi-kin',
  name: 'Kopi & Kin',
  area: 'Tiong Bahru',
  lat: 1.28,
  lng: 103.83,
  priceBand: 2,
  cuisine: 'Cafe',
  tags: ['small', 'halal', 'quiet', 'late'],
  closed: false,
}

function setup(over: Partial<Parameters<typeof RestaurantCard>[0]> = {}) {
  const props = { r, state: undefined, on_target: vi.fn(), on_choose: vi.fn(), picking: false, picked: false, on_pick: vi.fn(), ...over }
  render(
    <MemoryRouter>
      <RestaurantCard {...props} />
    </MemoryRouter>,
  )
  return props
}

test('shows the name, area, price band and cuisine icon', () => {
  setup()
  expect(screen.getByText('Kopi & Kin')).toBeInTheDocument()
  expect(screen.getByText(/Tiong Bahru/)).toBeInTheDocument()
  expect(screen.getByText(/\$\$/)).toBeInTheDocument()
  expect(screen.getByText('☕')).toBeInTheDocument()
})

test('the name links to the place page', () => {
  setup()
  expect(screen.getByRole('link', { name: 'Kopi & Kin' })).toHaveAttribute('href', '/r/kopi-kin')
})

test('shows only one tag, so the card holds five things at most: tile, name, area and price, tag, Target button', () => {
  setup()
  expect(screen.getByText('Small groups')).toBeInTheDocument()
  expect(screen.queryByText('Halal')).not.toBeInTheDocument()
  expect(screen.queryByText('Quiet')).not.toBeInTheDocument()
  expect(screen.queryByText('Open late')).not.toBeInTheDocument()
})

test('a Conquered Spot shows the Conquered stamp in the tag slot instead of a tag', () => {
  setup({ state: 'conquered' })
  expect(screen.getByText('Conquered')).toBeInTheDocument()
  expect(screen.queryByText('Small groups')).not.toBeInTheDocument()
})

test('the hero variant is the same card, only larger: same name, link and one Target button', () => {
  const { container } = render(
    <MemoryRouter>
      <RestaurantCard r={r} variant="hero" state={undefined} on_target={vi.fn()} on_choose={vi.fn()} picking={false} picked={false} on_pick={vi.fn()} />
    </MemoryRouter>,
  )
  expect(container.querySelector('article.card-hero')).not.toBeNull()
  expect(screen.getByRole('link', { name: 'Kopi & Kin' })).toBeInTheDocument()
  expect(screen.getAllByRole('button')).toHaveLength(1)
})

test('a normal card is not a hero', () => {
  setup()
  expect(document.querySelector('article.card-hero')).toBeNull()
})

describe('state-change motion hook', () => {
  const card = (state: 'targeted' | 'conquered' | undefined) => (
    <MemoryRouter>
      <RestaurantCard r={r} state={state} on_target={vi.fn()} on_choose={vi.fn()} picking={false} picked={false} on_pick={vi.fn()} />
    </MemoryRouter>
  )
  const target_button = () => screen.getByRole('button', { name: /Kopi & Kin/ })

  test('nothing animates on first render, even for a place that is already a Target', () => {
    render(card('targeted'))
    expect(target_button()).not.toHaveAttribute('data-moved')
  })

  test('becoming a Target marks the button for the lock-on motion', () => {
    const { rerender } = render(card(undefined))
    rerender(card('targeted'))
    expect(target_button()).toHaveAttribute('data-moved', 'lock')
  })

  test('becoming Conquered marks it for the flag-plant motion', () => {
    const { rerender } = render(card('targeted'))
    rerender(card('conquered'))
    expect(target_button()).toHaveAttribute('data-moved', 'plant')
  })

  test('removing a Target does not animate', () => {
    const { rerender } = render(card('targeted'))
    rerender(card(undefined))
    expect(target_button()).not.toHaveAttribute('data-moved')
  })

  test('the mark also clears on its own, for phones where no animation runs (reduced motion)', () => {
    vi.useFakeTimers()
    try {
      const { rerender } = render(card(undefined))
      rerender(card('conquered'))
      expect(target_button()).toHaveAttribute('data-moved', 'plant')
      act(() => {
        vi.advanceTimersByTime(700)
      })
      expect(target_button()).not.toHaveAttribute('data-moved')
    } finally {
      vi.useRealTimers()
    }
  })

  test('the mark is cleared when the animation ends, so it can play again', () => {
    const { rerender } = render(card(undefined))
    rerender(card('targeted'))
    // jsdom has no AnimationEvent, so React listens for the prefixed name there; browsers use animationend
    fireEvent.animationEnd(target_button())
    fireEvent(target_button(), new Event('webkitAnimationEnd', { bubbles: true }))
    expect(target_button()).not.toHaveAttribute('data-moved')
  })
})

test('there is exactly one action button on a normal card: the crosshair Target button', async () => {
  const props = setup()
  expect(screen.getAllByRole('button')).toHaveLength(1)
  await userEvent.click(screen.getByRole('button', { name: 'Target Kopi & Kin' }))
  expect(props.on_target).toHaveBeenCalledOnce()
})

test('a Target shows as pressed and the button offers to remove it', () => {
  setup({ state: 'targeted' })
  const button = screen.getByRole('button', { name: 'Remove Kopi & Kin from Targets' })
  expect(button).toHaveAttribute('aria-pressed', 'true')
})

test('a Conquered Spot shows a Conquered stamp and the button offers to move it back to Targets', () => {
  setup({ state: 'conquered' })
  expect(screen.getByText('Conquered')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Move Kopi & Kin back to Targets' })).toBeInTheDocument()
})

test('while picking for a vote the Target button is replaced by a pick toggle', async () => {
  const props = setup({ picking: true })
  expect(screen.queryByRole('button', { name: /Target Kopi/ })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Pick Kopi & Kin for the vote' }))
  expect(props.on_pick).toHaveBeenCalledOnce()
})

test('a picked place shows as pressed', () => {
  setup({ picking: true, picked: true })
  expect(screen.getByRole('button', { name: 'Remove Kopi & Kin from the vote' })).toHaveAttribute('aria-pressed', 'true')
})

test('Conquered is drawn with a flag icon, never a stamp', () => {
  const { container } = render(
    <MemoryRouter>
      <RestaurantCard r={r} state="conquered" on_target={vi.fn()} on_choose={vi.fn()} picking={false} picked={false} on_pick={vi.fn()} />
    </MemoryRouter>,
  )
  expect(container.querySelectorAll('svg.lucide-flag').length).toBeGreaterThanOrEqual(2)
  expect(container.querySelector('svg.lucide-stamp')).toBeNull()
})

describe('press and hold on the Target button', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const button = (name = 'Target Kopi & Kin') => screen.getByRole('button', { name })

  function hold(el: HTMLElement, ms = 600) {
    fireEvent.pointerDown(el, { pointerType: 'touch' })
    act(() => {
      vi.advanceTimersByTime(ms)
    })
  }

  test('a quick tap still just toggles the Target and opens no menu', () => {
    const props = setup()
    fireEvent.pointerDown(button())
    act(() => {
      vi.advanceTimersByTime(100)
    })
    fireEvent.pointerUp(button())
    fireEvent.click(button())
    expect(props.on_target).toHaveBeenCalledOnce()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  test('holding for about half a second opens a menu with Target and Conquer', () => {
    setup()
    hold(button())
    expect(screen.getByRole('menu', { name: 'Choose for Kopi & Kin' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Make Kopi & Kin a Target' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Conquer Kopi & Kin' })).toBeInTheDocument()
  })

  test('letting go after a hold does not also count as a tap', () => {
    const props = setup()
    hold(button())
    fireEvent.pointerUp(button())
    fireEvent.click(button())
    expect(props.on_target).not.toHaveBeenCalled()
  })

  test('the menu opens only after the hold time, not before', () => {
    setup()
    fireEvent.pointerDown(button())
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  test('moving the finger away (scrolling) cancels the hold', () => {
    setup()
    fireEvent.pointerDown(button(), { clientX: 10, clientY: 10 })
    fireEvent.pointerMove(button(), { clientX: 10, clientY: 60 })
    act(() => {
      vi.advanceTimersByTime(700)
    })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  test('leaving the button early cancels the hold', () => {
    setup()
    fireEvent.pointerDown(button())
    fireEvent.pointerLeave(button())
    act(() => {
      vi.advanceTimersByTime(700)
    })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  test('choosing Conquer reports the choice and closes the menu', () => {
    const props = setup()
    hold(button())
    fireEvent.click(screen.getByRole('menuitem', { name: 'Conquer Kopi & Kin' }))
    expect(props.on_choose).toHaveBeenCalledWith('conquered')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  test('choosing Target reports the choice', () => {
    const props = setup({ state: 'conquered' })
    hold(button('Move Kopi & Kin back to Targets'))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Make Kopi & Kin a Target' }))
    expect(props.on_choose).toHaveBeenCalledWith('targeted')
  })

  test('the current state is marked, and an Untarget choice appears for a place that is already a spot', () => {
    setup({ state: 'targeted' })
    hold(button('Remove Kopi & Kin from Targets'))
    expect(screen.getByRole('menuitem', { name: 'Make Kopi & Kin a Target' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('menuitem', { name: 'Untarget Kopi & Kin' })).toBeInTheDocument()
  })

  test('no Untarget choice for a place that is not a spot yet', () => {
    setup()
    hold(button())
    expect(screen.queryByRole('menuitem', { name: /Untarget/ })).not.toBeInTheDocument()
  })

  test('Untarget reports none', () => {
    const props = setup({ state: 'conquered' })
    hold(button('Move Kopi & Kin back to Targets'))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Untarget Kopi & Kin' }))
    expect(props.on_choose).toHaveBeenCalledWith('none')
  })

  test('Untarget is worded that way and uses a circle icon, not a bin', () => {
    setup({ state: 'targeted' })
    hold(button('Remove Kopi & Kin from Targets'))
    const item = screen.getByRole('menuitem', { name: 'Untarget Kopi & Kin' })
    expect(item).toHaveTextContent('Untarget')
    expect(item.querySelector('svg.lucide-circle')).not.toBeNull()
    expect(item.querySelector('svg.lucide-trash-2, svg.lucide-trash')).toBeNull()
    expect(screen.queryByText('Remove', { selector: 'button[role="menuitem"]' })).not.toBeInTheDocument()
  })

  test('Escape closes the menu without choosing', () => {
    const props = setup()
    hold(button())
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(props.on_choose).not.toHaveBeenCalled()
  })

  test('tapping elsewhere closes the menu', () => {
    setup()
    hold(button())
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  test('right-click or the keyboard menu key opens it too, so it is not touch-only', () => {
    setup()
    fireEvent.contextMenu(button())
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  test('the button says it can be held, for people who use a screen reader', () => {
    setup()
    expect(button()).toHaveAttribute('aria-description', expect.stringMatching(/press and hold/i))
  })

  test('while picking for a vote there is no menu', () => {
    setup({ picking: true })
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Pick Kopi & Kin for the vote' }))
    act(() => {
      vi.advanceTimersByTime(700)
    })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
