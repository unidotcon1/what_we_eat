import { act, renderHook } from '@testing-library/react'
import { useSaveActions } from './useSaveActions'
import * as auth from '../data/auth'
import * as saves from '../data/saves'
import { resetStoresForTest } from '../local/store'

vi.mock('../data/auth')
vi.mock('../data/saves')

beforeEach(() => {
  localStorage.clear()
  resetStoresForTest()
  vi.mocked(saves.syncSaveForCurrentUser).mockResolvedValue(undefined)
})

test('signed out: toggling only changes the device list', () => {
  vi.mocked(auth.useUser).mockReturnValue({ user: null, ready: true })
  const { result } = renderHook(() => useSaveActions())
  act(() => result.current.toggle('kopi-kin'))
  expect(result.current.saved.has('kopi-kin')).toBe(true)
  expect(saves.syncSaveForCurrentUser).not.toHaveBeenCalled()
})

test('signed in: saving then unsaving syncs each change to the account', () => {
  vi.mocked(auth.useUser).mockReturnValue({ user: { id: 'u1', email: 'a@b.sg' }, ready: true })
  const { result } = renderHook(() => useSaveActions())
  act(() => result.current.toggle('kopi-kin'))
  act(() => result.current.toggle('kopi-kin'))
  expect(saves.syncSaveForCurrentUser).toHaveBeenNthCalledWith(1, 'u1', 'kopi-kin', true)
  expect(saves.syncSaveForCurrentUser).toHaveBeenNthCalledWith(2, 'u1', 'kopi-kin', false)
})

test('a failed sync does not break the local save', async () => {
  vi.mocked(auth.useUser).mockReturnValue({ user: { id: 'u1', email: 'a@b.sg' }, ready: true })
  vi.mocked(saves.syncSaveForCurrentUser).mockRejectedValue(new Error('offline'))
  const { result } = renderHook(() => useSaveActions())
  await act(async () => result.current.toggle('kopi-kin'))
  expect(result.current.saved.has('kopi-kin')).toBe(true)
})
