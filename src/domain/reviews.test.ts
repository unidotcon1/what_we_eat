import { MAX_REVIEW_CHARS, validateReview } from './reviews'

test('a rating of 1 to 5 with short text is valid', () => {
  expect(validateReview(1, 'ok')).toBeNull()
  expect(validateReview(5, '')).toBeNull()
})

test('ratings 0, 6 and 3.5 are rejected', () => {
  expect(validateReview(0, 'x')).toBe('Pick a rating from 1 to 5')
  expect(validateReview(6, 'x')).toBe('Pick a rating from 1 to 5')
  expect(validateReview(3.5, 'x')).toBe('Pick a rating from 1 to 5')
})

test('280 characters is allowed and 281 is rejected', () => {
  expect(MAX_REVIEW_CHARS).toBe(280)
  expect(validateReview(4, 'a'.repeat(280))).toBeNull()
  expect(validateReview(4, 'a'.repeat(281))).toBe('Review must be 280 characters or fewer')
})

test('surrounding whitespace does not count toward the limit', () => {
  expect(validateReview(4, `  ${'a'.repeat(280)}  `)).toBeNull()
})
