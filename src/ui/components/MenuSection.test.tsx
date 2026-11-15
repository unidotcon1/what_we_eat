import { render, screen, within } from '@testing-library/react'
import { MenuSection } from './MenuSection'
import type { Restaurant } from '../../domain/types'

const r: Restaurant = { id: 'kopi-kin', name: 'Kopi & Kin', area: 'Tiong Bahru', lat: 1.28, lng: 103.83, priceBand: 1, cuisine: 'Cafe', tags: [], closed: false }

test('always has a Menu heading', () => {
  render(<MenuSection r={r} />)
  expect(screen.getByRole('heading', { level: 2, name: 'Menu' })).toBeInTheDocument()
})

test('with a menu it lists each section with its dishes and prices', () => {
  render(
    <MenuSection
      r={{
        ...r,
        menu: [
          { section: 'Drinks', items: [{ name: 'Kopi', price: '$2.20' }, { name: 'Teh' }] },
          { section: 'Bites', items: [{ name: 'Kaya toast', price: '$3' }] },
        ],
      }}
    />,
  )
  const drinks = screen.getByRole('group', { name: 'Drinks' })
  expect(within(drinks).getByText('Kopi')).toBeInTheDocument()
  expect(within(drinks).getByText('$2.20')).toBeInTheDocument()
  expect(within(drinks).getByText('Teh')).toBeInTheDocument()
  expect(screen.getByRole('group', { name: 'Bites' })).toBeInTheDocument()
})

test('with only a link it points to the restaurant\'s own menu, opening a new tab safely', () => {
  render(<MenuSection r={{ ...r, menu_url: 'https://kopikin.example/menu' }} />)
  const link = screen.getByRole('link', { name: /See the menu on their website/ })
  expect(link).toHaveAttribute('href', 'https://kopikin.example/menu')
  expect(link).toHaveAttribute('target', '_blank')
  expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
})

test('with both, the dishes show and the link is offered too', () => {
  render(<MenuSection r={{ ...r, menu: [{ section: 'Drinks', items: [{ name: 'Kopi' }] }], menu_url: 'https://kopikin.example/menu' }} />)
  expect(screen.getByText('Kopi')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /See the menu on their website/ })).toBeInTheDocument()
})

test('with nothing it says so plainly, with no empty box', () => {
  render(<MenuSection r={r} />)
  expect(screen.getByText('Menu not added yet')).toBeInTheDocument()
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
})
