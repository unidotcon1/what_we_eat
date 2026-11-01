import { act, renderHook } from '@testing-library/react'
import { clear_sync_problem, report_sync_problem, reset_sync_status_for_test, use_sync_problem } from './sync_status'

beforeEach(() => reset_sync_status_for_test())

test('starts with no problem', () => {
  const { result } = renderHook(() => use_sync_problem())
  expect(result.current).toBeNull()
})

test('a reported problem is shown to everything listening, and can be cleared', () => {
  const { result } = renderHook(() => use_sync_problem())
  act(() => report_sync_problem(new Error('Could not save 2 of 9 spots: nope')))
  expect(result.current).toMatch(/could not be saved to your account/i)
  act(() => clear_sync_problem())
  expect(result.current).toBeNull()
})

test('the raw database message is not shown to the person', () => {
  const { result } = renderHook(() => use_sync_problem())
  act(() => report_sync_problem(new Error('violates foreign key constraint "spots_place_id_fkey"')))
  expect(result.current).not.toMatch(/constraint|fkey/i)
})
