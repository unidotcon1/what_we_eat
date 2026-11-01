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
