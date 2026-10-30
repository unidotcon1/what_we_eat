export type Theme = 'light' | 'dark'

const KEY = 'wwe.theme'

export function applyStoredTheme() {
  try {
    const t = localStorage.getItem(KEY)
    if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t
  } catch {
    // storage blocked: follow the phone setting
  }
}

export function currentTheme(): Theme {
  const set = document.documentElement.dataset.theme
  if (set === 'light' || set === 'dark') return set
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // the choice still applies for this visit
  }
}
