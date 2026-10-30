import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorBoundary } from './ErrorBoundary'

function Bomb(): React.ReactElement {
  throw new Error('boom')
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})
afterEach(() => vi.restoreAllMocks())

test('shows its children when nothing goes wrong', () => {
  render(
    <ErrorBoundary>
      <p>all good</p>
    </ErrorBoundary>,
  )
  expect(screen.getByText('all good')).toBeInTheDocument()
})

test('a crash shows a friendly message and a reload button, not a blank page', () => {
  render(
    <ErrorBoundary>
      <Bomb />
    </ErrorBoundary>,
  )
  expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
  expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
})

test('the message does not leak the error details to the user', () => {
  render(
    <ErrorBoundary>
      <Bomb />
    </ErrorBoundary>,
  )
  expect(screen.queryByText(/boom/)).not.toBeInTheDocument()
})

test('Reload calls the reload function', async () => {
  const reload = vi.fn()
  render(
    <ErrorBoundary on_reload={reload}>
      <Bomb />
    </ErrorBoundary>,
  )
  await userEvent.click(screen.getByRole('button', { name: 'Reload' }))
  expect(reload).toHaveBeenCalledOnce()
})
