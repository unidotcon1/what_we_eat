import { shareLinks, tally } from './poll'

test('tally counts votes per option and names the leader', () => {
  const out = tally([{ optionId: 'a' }, { optionId: 'a' }, { optionId: 'b' }], ['a', 'b', 'c'])
  expect(out.counts).toEqual({ a: 2, b: 1, c: 0 })
  expect(out.leaders).toEqual(['a'])
})

test('a tie returns every tied leader, not an arbitrary winner', () => {
  const out = tally([{ optionId: 'a' }, { optionId: 'b' }], ['a', 'b'])
  expect(out.leaders).toEqual(['a', 'b'])
})

test('zero votes returns no leaders', () => {
  expect(tally([], ['a', 'b']).leaders).toEqual([])
})

test('votes for unknown options are ignored', () => {
  expect(tally([{ optionId: 'zzz' }], ['a']).counts).toEqual({ a: 0 })
})

test('shareLinks lists numbered options and the link, URL-encoded', () => {
  const links = shareLinks('Friday dinner', ['Long Table Hotpot', 'Kopi & Kin'], 'https://whatweeat.app/p/x7k2')
  const text = 'Friday dinner\n1. Long Table Hotpot\n2. Kopi & Kin\nVote: https://whatweeat.app/p/x7k2'
  expect(links.whatsapp).toBe(`https://wa.me/?text=${encodeURIComponent(text)}`)
  expect(links.telegram).toBe(
    `https://t.me/share/url?url=${encodeURIComponent('https://whatweeat.app/p/x7k2')}&text=${encodeURIComponent('Friday dinner\n1. Long Table Hotpot\n2. Kopi & Kin')}`,
  )
})
