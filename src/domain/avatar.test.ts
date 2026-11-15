import { AVATAR_EMOJI, DEFAULT_AVATAR, avatar_label, clean_initials, parse_avatar } from './avatar'

describe('clean_initials', () => {
  test('keeps up to two letters or digits, in capitals', () => {
    expect(clean_initials('lq')).toBe('LQ')
    expect(clean_initials(' a-b c ')).toBe('AB')
    expect(clean_initials('x7')).toBe('X7')
  })
  test('drops symbols, markup and emoji', () => {
    expect(clean_initials('<b>')).toBe('B')
    expect(clean_initials('🍜!')).toBe('')
  })
})

describe('parse_avatar', () => {
  test('nothing saved gives the default picture', () => {
    expect(parse_avatar(null)).toEqual(DEFAULT_AVATAR)
  })
  test('a saved picture is read back', () => {
    const saved = { shape: 'hexagon', colour: 'cotton', kind: 'initials', text: 'LQ' }
    expect(parse_avatar(JSON.stringify(saved))).toEqual(saved)
  })
  test('damaged text gives the default picture', () => {
    expect(parse_avatar('{not json')).toEqual(DEFAULT_AVATAR)
    expect(parse_avatar('"hello"')).toEqual(DEFAULT_AVATAR)
  })
  test('each unknown part falls back on its own', () => {
    const odd = { shape: 'star', colour: 'cherry', kind: 'emoji', text: AVATAR_EMOJI[3], extra: 1 }
    expect(parse_avatar(JSON.stringify(odd))).toEqual({ ...DEFAULT_AVATAR, text: AVATAR_EMOJI[3] })
  })
  test('an emoji outside our list is replaced by the default one', () => {
    const odd = { ...DEFAULT_AVATAR, text: '<script>' }
    expect(parse_avatar(JSON.stringify(odd))).toEqual(DEFAULT_AVATAR)
  })
  test('initials are cleaned, and empty initials stay empty', () => {
    const typed = { ...DEFAULT_AVATAR, kind: 'initials', text: 'l.q.x' }
    expect(parse_avatar(JSON.stringify(typed)).text).toBe('LQ')
    expect(parse_avatar(JSON.stringify({ ...typed, text: 42 })).text).toBe('')
  })
})

describe('avatar_label', () => {
  test('says what a screen reader should hear', () => {
    expect(avatar_label({ ...DEFAULT_AVATAR, kind: 'initials', text: 'LQ' })).toBe('Profile picture: LQ')
    expect(avatar_label(DEFAULT_AVATAR)).toBe('Profile picture')
  })
})
