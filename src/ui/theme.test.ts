import { applyStoredTheme, currentTheme, setTheme } from './theme'

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

function phone_prefers(scheme: 'light' | 'dark') {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes(scheme), media: q, addEventListener() {}, removeEventListener() {} }))
}
afterEach(() => vi.unstubAllGlobals())

test('dark leads: with no saved choice the app is dark, even on a phone set to light', () => {
  phone_prefers('light')
  applyStoredTheme()
  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(currentTheme()).toBe('dark')
})

test('a saved light choice is respected', () => {
  phone_prefers('dark')
  localStorage.setItem('wwe.theme', 'light')
  applyStoredTheme()
  expect(currentTheme()).toBe('light')
})

test('setTheme applies and remembers the choice', () => {
  setTheme('light')
  expect(document.documentElement.dataset.theme).toBe('light')
  expect(localStorage.getItem('wwe.theme')).toBe('light')
})

test('blocked storage still gives dark', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  applyStoredTheme()
  expect(currentTheme()).toBe('dark')
  vi.restoreAllMocks()
})
