import { name_similarity, normalise_name } from './text'

test('normalise_name ignores case, accents, punctuation and filler words', () => {
  expect(normalise_name("  Jumbo Seafood (East Coast) ")).toBe('jumbo seafood east coast')
  expect(normalise_name('Café Brûlée & Co.')).toBe('cafe brulee co')
  expect(normalise_name("Restaurant Long Table Hotpot, Singapore")).toBe('long table hotpot')
})

test('normalise_name keeps non-latin characters such as Chinese', () => {
  expect(normalise_name('Boon Tong Kee 文東記')).toBe('boon tong kee 文東記')
})

test('normalise_name of nothing useful is an empty string', () => {
  expect(normalise_name('')).toBe('')
  expect(normalise_name(' - , ')).toBe('')
})

describe('name_similarity', () => {
  test('identical names score 1, whatever the formatting', () => {
    expect(name_similarity('Kopi & Kin', 'KOPI & KIN')).toBe(1)
  })
  test('a name with an extra word scores between 0 and 1', () => {
    const s = name_similarity('Long Table Hotpot', 'Long Table Hotpot Bugis')
    expect(s).toBeGreaterThan(0.6)
    expect(s).toBeLessThan(1)
  })
  test('different names score low', () => {
    expect(name_similarity('Sakura Counter', 'Banana Leaf Hall')).toBeLessThan(0.2)
  })
  test('an empty name never matches anything', () => {
    expect(name_similarity('', 'Kopi')).toBe(0)
    expect(name_similarity('', '')).toBe(0)
  })
})
