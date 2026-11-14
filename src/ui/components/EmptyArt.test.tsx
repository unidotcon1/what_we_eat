import { render } from '@testing-library/react'
import { EmptyArt } from './EmptyArt'

test('the empty-state art is a decorative plate with a crosshair, fork, knife and flag', () => {
  const { container } = render(<EmptyArt />)
  const svg = container.querySelector('svg.empty-art')!
  expect(svg).not.toBeNull()
  expect(svg).toHaveAttribute('aria-hidden', 'true')
  expect(svg.querySelectorAll('circle').length).toBeGreaterThanOrEqual(4)
  expect(svg.querySelector('path[fill]')).not.toBeNull() // the flag
})

test('it uses theme tokens, not fixed colours, so it works in dark and light', () => {
  const { container } = render(<EmptyArt />)
  expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,6}/)
})
