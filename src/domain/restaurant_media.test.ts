import { parse_menu, safe_image_path, safe_menu_url } from './restaurant_media'

describe('safe_image_path: only our own picture files', () => {
  test.each(['/restaurants/kopi-kin.webp', '/restaurants/a/b.jpg', '/restaurants/x.JPEG', '/restaurants/x.png', '/restaurants/x.avif'])('accepts %s', (p) => {
    expect(safe_image_path(p)).toBe(p)
  })

  test.each([
    'https://evil.example/x.jpg',
    '//evil.example/x.jpg',
    'http://localhost/restaurants/x.jpg',
    'restaurants/x.jpg',
    '/other/x.jpg',
    '/restaurants/../secret.jpg',
    '/restaurants/x.svg',
    '/restaurants/x.jpg?token=1',
    '/restaurants/x y.jpg',
    '/restaurants/x.jpg#frag',
    'javascript:alert(1)',
    '',
    42,
    null,
    undefined,
  ])('refuses %s', (p) => {
    expect(safe_image_path(p)).toBeUndefined()
  })

  test('refuses a very long path', () => {
    expect(safe_image_path('/restaurants/' + 'a'.repeat(200) + '.jpg')).toBeUndefined()
  })
})

describe('safe_menu_url: https links only', () => {
  test('accepts a normal https link and returns it normalised', () => {
    expect(safe_menu_url('https://www.example.sg/menu')).toBe('https://www.example.sg/menu')
  })

  test.each([
    'http://example.sg/menu',
    'javascript:alert(1)',
    'data:text/html,<b>x</b>',
    'ftp://example.sg/menu',
    'https://user:pass@example.sg/menu',
    'https://',
    'not a url',
    '',
    7,
    null,
    undefined,
  ])('refuses %s', (u) => {
    expect(safe_menu_url(u)).toBeUndefined()
  })

  test('refuses a link over 300 characters', () => {
    expect(safe_menu_url('https://example.sg/' + 'a'.repeat(300))).toBeUndefined()
  })
})

describe('parse_menu: sections with dishes and optional prices', () => {
  test('reads well-formed sections', () => {
    const menu = parse_menu([
      { section: 'Mains', items: [{ name: 'Laksa', price: '$9' }, { name: 'Chicken rice' }] },
      { section: 'Drinks', items: [{ name: 'Kopi', price: '$2.20' }] },
    ])
    expect(menu).toEqual([
      { section: 'Mains', items: [{ name: 'Laksa', price: '$9' }, { name: 'Chicken rice' }] },
      { section: 'Drinks', items: [{ name: 'Kopi', price: '$2.20' }] },
    ])
  })

  test('drops bad entries instead of failing the whole menu, and cleans the text', () => {
    const menu = parse_menu([
      { section: 'Mains\u0000', items: [{ name: 'Laksa', price: 9 }, { name: '' }, 'nope', { name: 'Satay'.padEnd(200, 'x') }] },
      { section: '', items: [{ name: 'Orphan' }] },
      { items: [] },
      'junk',
    ])
    expect(menu).toHaveLength(1)
    expect(menu![0].section).toBe('Mains')
    expect(menu![0].items.map((i) => i.name.length)).toEqual([5, 80])
    expect(menu![0].items[0].price).toBeUndefined()
  })

  test('gives nothing back for no usable menu', () => {
    expect(parse_menu(undefined)).toBeUndefined()
    expect(parse_menu(null)).toBeUndefined()
    expect(parse_menu('Laksa')).toBeUndefined()
    expect(parse_menu([])).toBeUndefined()
    expect(parse_menu([{ section: 'Empty', items: [] }])).toBeUndefined()
  })

  test('caps the size so one bad row cannot flood the page', () => {
    const many = Array.from({ length: 50 }, (_, s) => ({ section: `S${s}`, items: Array.from({ length: 100 }, (_, i) => ({ name: `Dish ${i}` })) }))
    const menu = parse_menu(many)!
    expect(menu.length).toBe(20)
    expect(menu[0].items.length).toBe(60)
  })
})
