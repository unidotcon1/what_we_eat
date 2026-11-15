import { act, renderHook } from '@testing-library/react'
import { DEFAULT_AVATAR, type Avatar } from '../domain/avatar'
import { get_avatar, reset_avatar_for_test, set_avatar, use_avatar } from './avatar'

const mine: Avatar = { shape: 'square', colour: 'maroon', kind: 'initials', text: 'LQ' }

beforeEach(() => {
  localStorage.clear()
  reset_avatar_for_test()
})

test('the default picture shows until one is designed', () => {
  expect(get_avatar()).toEqual(DEFAULT_AVATAR)
})

test('a saved picture is read back, and a damaged one falls back to the default', () => {
  localStorage.setItem('wwe.avatar', JSON.stringify(mine))
  expect(get_avatar()).toEqual(mine)
  reset_avatar_for_test()
  localStorage.setItem('wwe.avatar', 'oops')
  expect(get_avatar()).toEqual(DEFAULT_AVATAR)
})

test('saving a picture stores it and updates everything showing it', () => {
  const { result } = renderHook(() => use_avatar())
  act(() => set_avatar(mine))
  expect(result.current).toEqual(mine)
  expect(JSON.parse(localStorage.getItem('wwe.avatar')!)).toEqual(mine)
})

test('what is saved is cleaned first', () => {
  set_avatar({ ...mine, text: 'l<q>z' })
  expect(get_avatar().text).toBe('LQ')
})

test('blocked storage does not break it', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  set_avatar(mine)
  expect(get_avatar()).toEqual(mine)
  vi.restoreAllMocks()
})
