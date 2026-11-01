import { readFileSync } from 'node:fs'

const headers = readFileSync('public/_headers', 'utf8')
const csp = /Content-Security-Policy:\s*(.+)/.exec(headers)?.[1] ?? ''
const directive = (name: string) => csp.split(';').map((part) => part.trim().split(' ')).find((part) => part[0] === name)?.slice(1) ?? []

test('there is a Content-Security-Policy', () => {
  expect(csp).not.toBe('')
})

test('connect-src names our own database host, never a wildcard over all of supabase.co', () => {
  const sources = directive('connect-src')
  expect(sources).toContain("'self'")
  expect(sources.some((s) => s.includes('*'))).toBe(false)
  expect(sources).toContain('https://pryhmdtapywfferszhus.supabase.co')
  expect(sources).toContain('wss://pryhmdtapywfferszhus.supabase.co')
})

test('scripts only come from our own origin, with no inline or eval', () => {
  expect(directive('script-src')).toEqual(["'self'"])
})

test('the page cannot be framed, and plugins and base-tag tricks are off', () => {
  expect(directive('frame-ancestors')).toEqual(["'none'"])
  expect(directive('object-src')).toEqual(["'none'"])
  expect(directive('base-uri')).toEqual(["'self'"])
})
