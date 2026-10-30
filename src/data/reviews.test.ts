import { submitReview } from './reviews'

function fakeClient(user: { id: string } | null) {
  const inserts: unknown[] = []
  const client = {
    auth: { getUser: async () => ({ data: { user } }) },
    from: (table: string) => ({
      insert: async (row: unknown) => {
        inserts.push({ table, row })
        return { error: null }
      },
    }),
  }
  return { client, inserts }
}

test('a signed-out user cannot submit a review', async () => {
  const { client, inserts } = fakeClient(null)
  await expect(submitReview(client as never, 'kopi-kin', 5, 'great')).rejects.toThrow('Sign in to write a review')
  expect(inserts).toHaveLength(0)
})

test('a valid review is inserted for the signed-in user with trimmed text', async () => {
  const { client, inserts } = fakeClient({ id: 'u1' })
  await submitReview(client as never, 'kopi-kin', 4, '  tasty  ')
  expect(inserts).toEqual([
    { table: 'reviews', row: { user_id: 'u1', restaurant_id: 'kopi-kin', rating: 4, body: 'tasty' } },
  ])
})

test('an invalid review is rejected before it reaches the database', async () => {
  const { client, inserts } = fakeClient({ id: 'u1' })
  await expect(submitReview(client as never, 'kopi-kin', 0, 'x')).rejects.toThrow('Pick a rating from 1 to 5')
  await expect(submitReview(client as never, 'kopi-kin', 3, 'a'.repeat(281))).rejects.toThrow('280 characters')
  expect(inserts).toHaveLength(0)
})
