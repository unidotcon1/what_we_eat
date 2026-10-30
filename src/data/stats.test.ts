import { fetchMyStatsFrom } from './auth'

test('the review count only counts the signed-in user’s own reviews', async () => {
  const filters: [string, unknown][] = []
  const query = (table: string) => {
    const q = {
      select: () => q,
      eq: (col: string, val: unknown) => {
        filters.push([`${table}.${col}`, val])
        return q
      },
      then: (ok: (v: unknown) => void) => ok({ count: 6, error: null }),
    }
    return q
  }
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    rpc: async () => ({ data: 92, error: null }),
    from: query,
  }
  const out = await fetchMyStatsFrom(client as never)
  expect(out).toEqual({ points: 92, saves: 6, reviews: 6 })
  expect(filters).toContainEqual(['reviews.user_id', 'u1'])
})
