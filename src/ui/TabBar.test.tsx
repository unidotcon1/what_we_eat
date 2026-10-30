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

test('renders four labelled links: Explore, Saved, Vote, Me', () => {
  renderAt('/')
  for (const name of ['Explore', 'Saved', 'Vote', 'Me']) {
    expect(screen.getByRole('link', { name })).toBeInTheDocument()
  }
})

test('the link for the current route has aria-current="page"', () => {
  renderAt('/saved')
  expect(screen.getByRole('link', { name: 'Saved' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByRole('link', { name: 'Explore' })).not.toHaveAttribute('aria-current')
})
