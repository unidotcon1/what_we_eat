import { act, renderHook } from '@testing-library/react'
import { getVoterToken, resetStoresForTest, useSaves, useShortlist } from './store'

beforeEach(() => {
  localStorage.clear()
  resetStoresForTest()
})

test('toggle adds then removes a saved restaurant', () => {
  const { result } = renderHook(() => useSaves())
  act(() => result.current.toggle('kopi-kin'))
  expect(result.current.saved.has('kopi-kin')).toBe(true)
  act(() => result.current.toggle('kopi-kin'))
  expect(result.current.saved.has('kopi-kin')).toBe(false)
})

test('saves persist across a reload', () => {
  const first = renderHook(() => useSaves())
  act(() => first.result.current.toggle('a'))
  first.unmount()
  resetStoresForTest()
  const second = renderHook(() => useSaves())
  expect(second.result.current.saved.has('a')).toBe(true)
})

test('corrupt JSON in storage yields an empty set', () => {
  localStorage.setItem('wwe.saves', '{not json')
  const { result } = renderHook(() => useSaves())
  expect(result.current.saved.size).toBe(0)
})

test('storage throwing does not crash the hooks', () => {
  const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota')
  })
  const { result } = renderHook(() => useSaves())
  expect(() => act(() => result.current.toggle('a'))).not.toThrow()
  expect(result.current.saved.has('a')).toBe(true)
  spy.mockRestore()
})

test('two hook instances stay in sync', () => {
  const a = renderHook(() => useShortlist())
  const b = renderHook(() => useShortlist())
  act(() => a.result.current.toggle('x'))
  expect(b.result.current.ids).toEqual(['x'])
})

test('shortlist clear empties the draft', () => {
  const { result } = renderHook(() => useShortlist())
  act(() => result.current.toggle('x'))
  act(() => result.current.clear())
  expect(result.current.ids).toEqual([])
})

test('voter token is stable across calls and stored on the device', () => {
  const t = getVoterToken()
  expect(t.length).toBeGreaterThan(10)
  expect(getVoterToken()).toBe(t)
  expect(localStorage.getItem('wwe.voter')).toBe(t)
})
