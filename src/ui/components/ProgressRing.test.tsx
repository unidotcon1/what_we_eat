import { render, screen } from '@testing-library/react'
import { ProgressRing, ring_offset } from './ProgressRing'

describe('ring_offset', () => {
  test('empty leaves the whole circle to draw, full leaves none', () => {
    expect(ring_offset(0, 25, 100)).toBe(100)
    expect(ring_offset(25, 25, 100)).toBe(0)
  })
  test('in between is proportional', () => {
    expect(ring_offset(5, 20, 100)).toBe(75)
  })
  test('too many, too few and a zero maximum are kept sensible', () => {
    expect(ring_offset(40, 25, 100)).toBe(0)
    expect(ring_offset(-3, 25, 100)).toBe(100)
    expect(ring_offset(3, 0, 100)).toBe(100)
  })
})

describe('ProgressRing', () => {
  test('is one image with a spoken label, and shows what it is given in the middle', () => {
    render(
      <ProgressRing value={3} max={25} label="Conquered 3 of 25">
        <b>3</b>
      </ProgressRing>,
    )
    expect(screen.getByRole('img', { name: 'Conquered 3 of 25' })).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  test('draws the arc by the share done', () => {
    const { container } = render(<ProgressRing value={5} max={20} label="x" />)
    const arc = container.querySelector('.ring-arc') as SVGCircleElement
    const total = Number(arc.getAttribute('stroke-dasharray'))
    expect(Number(arc.getAttribute('stroke-dashoffset'))).toBeCloseTo(total * 0.75, 1)
  })
})
