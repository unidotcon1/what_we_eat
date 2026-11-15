/** A profile picture made in the app: a shape, a palette colour and an emoji or initials. Never an uploaded photo. */

export const AVATAR_SHAPES = ['circle', 'square', 'hexagon'] as const
export const AVATAR_COLOURS = ['cherry', 'maroon', 'noir', 'cotton'] as const
export const AVATAR_KINDS = ['emoji', 'initials'] as const
/** A fixed list, so a picture can only ever hold text we chose or two plain letters. */
export const AVATAR_EMOJI = ['🍜', '🍣', '🍔', '🍕', '🥟', '🍛', '🧋', '🍰', '🌶️', '🍗', '🦀', '☕'] as const

export type AvatarShape = (typeof AVATAR_SHAPES)[number]
export type AvatarColour = (typeof AVATAR_COLOURS)[number]
export type AvatarKind = (typeof AVATAR_KINDS)[number]

export interface Avatar {
  shape: AvatarShape
  colour: AvatarColour
  kind: AvatarKind
  /** One emoji from AVATAR_EMOJI, or up to two capital letters or digits. */
  text: string
}

export const DEFAULT_AVATAR: Avatar = { shape: 'circle', colour: 'cherry', kind: 'emoji', text: AVATAR_EMOJI[0] }

export function clean_initials(raw: string): string {
  return (raw.match(/[a-z0-9]/gi) ?? []).slice(0, 2).join('').toUpperCase()
}

function one_of<T extends string>(allowed: readonly T[], value: unknown, fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

/** Makes any object safe to show: each unknown part falls back to the default on its own. */
export function clean_avatar(value: unknown): Avatar {
  if (typeof value !== 'object' || value === null) return DEFAULT_AVATAR
  const v = value as Record<string, unknown>
  const kind = one_of(AVATAR_KINDS, v.kind, DEFAULT_AVATAR.kind)
  return {
    shape: one_of(AVATAR_SHAPES, v.shape, DEFAULT_AVATAR.shape),
    colour: one_of(AVATAR_COLOURS, v.colour, DEFAULT_AVATAR.colour),
    kind,
    text: kind === 'emoji' ? one_of(AVATAR_EMOJI, v.text, AVATAR_EMOJI[0]) : clean_initials(typeof v.text === 'string' ? v.text : ''),
  }
}

/** Reads the saved text from the device. */
export function parse_avatar(raw: string | null): Avatar {
  if (!raw) return DEFAULT_AVATAR
  try {
    return clean_avatar(JSON.parse(raw))
  } catch {
    return DEFAULT_AVATAR
  }
}

export function avatar_label(avatar: Avatar): string {
  return avatar.kind === 'initials' && avatar.text ? `Profile picture: ${avatar.text}` : 'Profile picture'
}
