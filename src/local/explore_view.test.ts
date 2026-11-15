import { act, renderHook } from '@testing-library/react'
import { get_explore_view, reset_explore_view_for_test, set_explore_view, use_explore_view } from './explore_view'

beforeEach(() => {
  localStorage.clear()
  reset_explore_view_for_test()
})

test('the default is Details, the list people already know', () => {
  expect(get_explore_view()).toBe('details')
})

test('a saved choice of images is read back', () => {
  localStorage.setItem('wwe.explore_view', 'images')
  expect(get_explore_view()).toBe('images')
})

test('a damaged saved value falls back to Details', () => {
  localStorage.setItem('wwe.explore_view', 'cinema')
  expect(get_explore_view()).toBe('details')
})

test('setting the view saves it and updates every screen using it', () => {
  const { result } = renderHook(() => use_explore_view())
  expect(result.current).toBe('details')
  act(() => set_explore_view('images'))
  expect(result.current).toBe('images')
  expect(localStorage.getItem('wwe.explore_view')).toBe('images')
})

test('blocked storage does not break it: the choice still holds for this visit', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  set_explore_view('images')
  expect(get_explore_view()).toBe('images')
  vi.restoreAllMocks()
})
