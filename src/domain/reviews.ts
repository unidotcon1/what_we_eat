export const MAX_REVIEW_CHARS = 280

/** Returns an error message, or null when the review is acceptable. */
export function validateReview(rating: number, body: string): string | null {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return 'Pick a rating from 1 to 5'
  if (body.trim().length === 0) return 'Write a few words about it'
  if (body.trim().length > MAX_REVIEW_CHARS) return `Review must be ${MAX_REVIEW_CHARS} characters or fewer`
  return null
}
