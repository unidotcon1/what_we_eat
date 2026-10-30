import { activeTags, emptyFilters, removeTag } from './filterTags'

test('emptyFilters has no active tags', () => {
  expect(activeTags(emptyFilters)).toEqual([])
})

test('a price band, a distance and an audience make three tags', () => {
  const f = { ...emptyFilters, bands: [2 as const], maxKm: 2, audience: ['group' as const] }
  const tags = activeTags(f)
  expect(tags).toHaveLength(3)
  expect(tags.map((t) => t.label)).toEqual(['$$', '2 km', '6+ group'])
})

test('removeTag clears only that filter', () => {
  const f = { ...emptyFilters, bands: [2 as const, 3 as const], maxKm: 2 }
  const tag = activeTags(f).find((t) => t.label === '$$')!
  const next = removeTag(f, tag.key)
  expect(next.bands).toEqual([3])
  expect(next.maxKm).toBe(2)
})

test('openNow and query count as tags', () => {
  const tags = activeTags({ ...emptyFilters, openNow: true })
  expect(tags.map((t) => t.label)).toEqual(['Open now'])
})
