export type Theme = 'light' | 'dark'

const KEY = 'wwe.theme'

/** Dark leads: the app is dark unless the person has chosen light. */
export function applyStoredTheme() {
  let theme: Theme = 'dark'
  try {
    if (localStorage.getItem(KEY) === 'light') theme = 'light'
  } catch {
    // storage blocked: stay with the default
  }
  document.documentElement.dataset.theme = theme
}

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // the choice still applies for this visit
  }
}
