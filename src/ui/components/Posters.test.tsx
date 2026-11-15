import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { PosterArt } from './PosterArt'
import { PosterCard } from './PosterCard'
import { Shelf } from './Shelf'
import type { Restaurant } from '../../domain/types'

const r: Restaurant = {
  id: 'kopi-kin',
  name: 'Kopi & Kin',
  area: 'Tiong Bahru',
  lat: 1.28,
  lng: 103.83,
  priceBand: 1,
  cuisine: 'Cafe',
  tags: ['small'],
  closed: false,
}

const wrap = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('PosterArt', () => {
  test('without a picture it draws the placeholder for the cuisine: plate rings and the cuisine emoji', () => {
    const { container } = wrap(<PosterArt r={r} />)
    expect(container.querySelector('img')).toBeNull()
    const art = container.querySelector('.poster-art')!
    expect(art).not.toBeNull()
    expect(art).toHaveAttribute('aria-hidden', 'true')
    expect(art).toHaveTextContent('☕')
  })

  test('the same cuisine always gets the same colour, so the shelves look consistent', () => {
    const a = wrap(<PosterArt r={r} />).container.querySelector('.poster-art')!.className
    const b = wrap(<PosterArt r={{ ...r, id: 'other', name: 'Other' }} />).container.querySelector('.poster-art')!.className
    expect(a).toBe(b)
    expect(a).toMatch(/art-\d/)
  })

  test('with a picture it shows it lazily, with no alt text because the name is written next to it', () => {
    const { container } = wrap(<PosterArt r={{ ...r, image: '/restaurants/kopi-kin.webp' }} />)
    const img = container.querySelector('img')!
    expect(img).toHaveAttribute('src', '/restaurants/kopi-kin.webp')
    expect(img).toHaveAttribute('loading', 'lazy')
    expect(img).toHaveAttribute('alt', '')
  })

  test('a picture that fails to load falls back to the placeholder instead of a broken image', () => {
    const { container } = wrap(<PosterArt r={{ ...r, image: '/restaurants/missing.webp' }} />)
    fireEvent.error(container.querySelector('img')!)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('.poster-art')).not.toBeNull()
  })
})

describe('PosterCard', () => {
  const card = (over: Partial<Parameters<typeof PosterCard>[0]> = {}) => {
    const props = { r, state: undefined, on_target: vi.fn(), picking: false, picked: false, on_pick: vi.fn(), ...over }
    wrap(<PosterCard {...props} />)
    return props
  }

  test('every poster is the same shape: art, one line with the name and nothing else on the picture', () => {
    card()
    const article = document.querySelector('article.poster')!
    expect(article.querySelector('.poster-art')).not.toBeNull()
    expect(within(article as HTMLElement).getByRole('link', { name: 'Kopi & Kin' })).toHaveAttribute('href', '/r/kopi-kin')
    expect(article.querySelector('.poster-name')).toHaveTextContent('Kopi & Kin')
  })

  test('the hero variant is the same card with a larger picture', () => {
    card({ variant: 'hero' })
    expect(document.querySelector('article.poster-hero')).not.toBeNull()
  })

  test('one small Target button on the corner: it adds, removes and moves back like the list card', async () => {
    const props = card()
    await userEvent.click(screen.getByRole('button', { name: 'Target Kopi & Kin' }))
    expect(props.on_target).toHaveBeenCalledOnce()
  })

  test('the button names follow the state', () => {
    const { unmount } = wrap(<PosterCard r={r} state="targeted" on_target={vi.fn()} picking={false} picked={false} on_pick={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Remove Kopi & Kin from Targets' })).toHaveAttribute('aria-pressed', 'true')
    unmount()
    wrap(<PosterCard r={r} state="conquered" on_target={vi.fn()} picking={false} picked={false} on_pick={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Move Kopi & Kin back to Targets' })).toBeInTheDocument()
  })

  test('a Conquered poster shows a flag, not a tag', () => {
    wrap(<PosterCard r={r} state="conquered" on_target={vi.fn()} picking={false} picked={false} on_pick={vi.fn()} />)
    expect(document.querySelector('svg.lucide-flag')).not.toBeNull()
  })

  test('while picking for a vote the corner button becomes the pick toggle', async () => {
    const props = card({ picking: true })
    expect(screen.queryByRole('button', { name: /Target Kopi/ })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Pick Kopi & Kin for the vote' }))
    expect(props.on_pick).toHaveBeenCalledOnce()
  })

  test('a picked poster shows as pressed', () => {
    card({ picking: true, picked: true })
    expect(screen.getByRole('button', { name: 'Remove Kopi & Kin from the vote' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('Shelf', () => {
  test('a titled row with a View more button, and its posters inside a scrolling list', () => {
    const on_more = vi.fn()
    wrap(
      <Shelf title="Date night" on_more={on_more}>
        <PosterCard r={r} state={undefined} on_target={vi.fn()} picking={false} picked={false} on_pick={vi.fn()} />
      </Shelf>,
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Date night' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Date night' })).toBeInTheDocument()
    expect(document.querySelector('.shelf-track article.poster')).not.toBeNull()
  })

  test('View more says which row it belongs to and reports the press', async () => {
    const on_more = vi.fn()
    wrap(<Shelf title="Date night" on_more={on_more}>{null}</Shelf>)
    await userEvent.click(screen.getByRole('button', { name: 'View more Date night' }))
    expect(on_more).toHaveBeenCalledOnce()
  })
})
