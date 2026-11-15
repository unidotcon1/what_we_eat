import { act, renderHook } from '@testing-library/react'
import { get_travel_mode, reset_travel_mode_for_test, set_travel_mode, use_travel_mode } from './travel_mode'

beforeEach(() => {
  localStorage.clear()
  reset_travel_mode_for_test()
})

test('the default is public transport, the most useful in Singapore', () => {
  expect(get_travel_mode()).toBe('transit')
})

test('a saved mode is read back, and a damaged one falls back to transit', () => {
  localStorage.setItem('wwe.travel_mode', 'walking')
  expect(get_travel_mode()).toBe('walking')
  reset_travel_mode_for_test()
  localStorage.setItem('wwe.travel_mode', 'teleport')
  expect(get_travel_mode()).toBe('transit')
})

test('choosing a mode saves it and updates everything showing it', () => {
  const { result } = renderHook(() => use_travel_mode())
  act(() => set_travel_mode('driving'))
  expect(result.current).toBe('driving')
  expect(localStorage.getItem('wwe.travel_mode')).toBe('driving')
})

test('blocked storage does not break it', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  set_travel_mode('walking')
  expect(get_travel_mode()).toBe('walking')
  vi.restoreAllMocks()
})
