import { render, screen } from '@testing-library/react'
import { MapView } from './MapView'
import type { Restaurant } from '../../domain/types'

const make = (id: string, name: string, lat: number, lng: number): Restaurant => ({
  id,
  name,
  area: 'Bugis',
  lat,
  lng,
  priceBand: 2,
  cuisine: 'Cafe',
  tags: [],
  closed: false,
})

const items = [make('a', 'Alpha', 1.3, 103.85), make('b', 'Beta', 1.31, 103.86), make('c', 'Gamma', 1.29, 103.84)]

test('shows one pin per restaurant', () => {
  render(<MapView items={items} />)
  expect(screen.getAllByTitle(/Alpha|Beta|Gamma/)).toHaveLength(3)
})

test('updates the pins when the list changes', () => {
  const { rerender } = render(<MapView items={items} />)
  rerender(<MapView items={items.slice(0, 1)} />)
  expect(screen.getAllByTitle(/Alpha|Beta|Gamma/)).toHaveLength(1)
})

test('an empty list shows no pins and does not crash', () => {
  render(<MapView items={[]} />)
  expect(screen.queryAllByTitle(/Alpha|Beta|Gamma/)).toHaveLength(0)
  expect(screen.getByRole('region', { name: 'Map' })).toBeInTheDocument()
})

test('credits OpenStreetMap', () => {
  render(<MapView items={items} />)
  expect(document.body.textContent).toContain('OpenStreetMap')
})
