import { cuisineIcon } from './cuisineIcons'

test('known cuisines get their own icon', () => {
  expect(cuisineIcon('Japanese')).toBe('🍣')
  expect(cuisineIcon('Western')).toBe('🍝')
  expect(cuisineIcon('Cafe')).toBe('☕')
})

test('an unknown cuisine falls back to a fork and knife', () => {
  expect(cuisineIcon('Martian')).toBe('🍴')
})
