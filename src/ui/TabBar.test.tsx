import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TabBar } from './TabBar'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TabBar />
    </MemoryRouter>,
  )
}

test('has five links: Explore, Map, Add a spot in the centre, Spots, Profile', () => {
  renderAt('/')
  const names = screen.getAllByRole('link').map((l) => l.getAttribute('aria-label') ?? l.textContent)
  expect(names).toEqual(['Explore', 'Map', 'Add a spot', 'Spots', 'Profile'])
})

test('each link goes to the right place', () => {
  renderAt('/')
  expect(screen.getByRole('link', { name: 'Explore' })).toHaveAttribute('href', '/')
  expect(screen.getByRole('link', { name: 'Map' })).toHaveAttribute('href', '/map')
  expect(screen.getByRole('link', { name: 'Add a spot' })).toHaveAttribute('href', '/add')
  expect(screen.getByRole('link', { name: 'Spots' })).toHaveAttribute('href', '/spots')
  expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/me')
})

test('the link for the current route has aria-current="page"', () => {
  renderAt('/spots')
  expect(screen.getByRole('link', { name: 'Spots' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByRole('link', { name: 'Explore' })).not.toHaveAttribute('aria-current')
})

test('the old Saved and Vote tabs are gone from the bar', () => {
  renderAt('/')
  expect(screen.queryByRole('link', { name: 'Saved' })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Vote' })).not.toBeInTheDocument()
})

test('the Spots tab does not use the flag, which is reserved for Conquered', () => {
  const { container } = renderAt('/')
  expect(container.querySelector('svg.lucide-flag')).toBeNull()
  expect(container.querySelector('svg.lucide-stamp')).toBeNull()
})
