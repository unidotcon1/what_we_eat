import { pwa_manifest } from './pwa_manifest'

test('has a stable id, so the installed app stays the same app if the start address changes', () => {
  expect(pwa_manifest.id).toBe('/')
})

test('names and colours match the brand', () => {
  expect(pwa_manifest.name).toBe('What We Eat')
  expect(pwa_manifest.short_name).toBe('What We Eat')
  expect(pwa_manifest.theme_color).toBe('#810100')
  expect(pwa_manifest.background_color).toBe('#1B1717')
})

test('opens full screen, upright, in English', () => {
  expect(pwa_manifest.display).toBe('standalone')
  expect(pwa_manifest.orientation).toBe('portrait')
  expect(pwa_manifest.lang).toBe('en-SG')
})

test('is filed as a food app', () => {
  expect(pwa_manifest.categories).toContain('food')
})

test('has 192 and 512 icons, and a separate maskable icon so Android can crop it safely', () => {
  const icons = pwa_manifest.icons
  expect(icons.find((i) => i.sizes === '192x192' && !i.purpose)).toBeDefined()
  expect(icons.find((i) => i.sizes === '512x512' && !i.purpose)).toBeDefined()
  expect(icons.find((i) => i.sizes === '512x512' && i.purpose === 'maskable')).toBeDefined()
  expect(icons.every((i) => i.src.startsWith('/') && i.type === 'image/png')).toBe(true)
})

test('long-press shortcuts open Spots, Map and Add a spot', () => {
  const urls = (pwa_manifest.shortcuts ?? []).map((s) => s.url)
  expect(urls).toEqual(['/spots', '/map', '/add'])
  expect((pwa_manifest.shortcuts ?? []).every((s) => s.name.length > 0 && s.icons.length > 0)).toBe(true)
})

test('the description is plain and under 150 characters so stores can show it', () => {
  expect(pwa_manifest.description.length).toBeLessThanOrEqual(150)
  expect(pwa_manifest.description).not.toMatch(/\bsaved\b/i)
})
