import { render, screen } from '@testing-library/react'
import { SuggestLink } from './SuggestLink'

test('renders a link to the Google Form when a url is configured', () => {
  render(<SuggestLink url="https://forms.gle/abc" />)
  expect(screen.getByRole('link', { name: /Suggest a restaurant/ })).toHaveAttribute('href', 'https://forms.gle/abc')
})

test('renders nothing when no url is configured', () => {
  const { container } = render(<SuggestLink url={undefined} />)
  expect(container).toBeEmptyDOMElement()
})
