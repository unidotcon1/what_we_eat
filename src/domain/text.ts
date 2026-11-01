const FILLER_WORDS = new Set(['restaurant', 'singapore', 'pte', 'ltd'])

/** Lower-cases, drops accents, punctuation and filler words, so "Café Brûlée & Co." and "cafe brulee co" compare equal. */
export function normalise_name(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word && !FILLER_WORDS.has(word))
    .join(' ')
}

/** 0 to 1: the share of words two names have in common. An empty name never matches. */
export function name_similarity(a: string, b: string): number {
  const left = new Set(normalise_name(a).split(' ').filter(Boolean))
  const right = new Set(normalise_name(b).split(' ').filter(Boolean))
  if (left.size === 0 || right.size === 0) return 0
  let shared = 0
  for (const word of left) if (right.has(word)) shared++
  return shared / (left.size + right.size - shared)
}

/**
 * Makes imported text safe to store: no control characters or lone surrogates (Postgres refuses both),
 * line breaks and tabs become spaces, runs of spaces collapse, and the result is at most max_chars whole characters.
 */
export function clean_text(value: string, max_chars: number): string {
  const cleaned = value
    .replace(/[\t\n\r]+/g, ' ')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
    .replace(/ {2,}/g, ' ')
    .trim()
  return Array.from(cleaned).slice(0, max_chars).join('').trim()
}
