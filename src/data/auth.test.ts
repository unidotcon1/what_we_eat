import { mergeLocalSaves } from './auth'

function fakeClient() {
  const upserts: { rows: unknown; opts: unknown }[] = []
  const rpcs: [string, unknown][] = []
  const client = {
    from: (table: string) => ({
      upsert: async (rows: unknown, opts: unknown) => {
        upserts.push({ rows: { table, rows }, opts })
        return { error: null }
      },
    }),
    rpc: async (fn: string, args: unknown) => {
      rpcs.push([fn, args])
      return { data: 5, error: null }
    },
  }
  return { client, upserts, rpcs }
}

test('merging three local saves upserts them once, ignoring duplicates', async () => {
  const { client, upserts } = fakeClient()
  await mergeLocalSaves(client as never, 'user-1', ['a', 'b', 'c'])
  expect(upserts).toHaveLength(1)
  expect(upserts[0].rows).toEqual({
    table: 'saves',
    rows: [
      { user_id: 'user-1', restaurant_id: 'a' },
      { user_id: 'user-1', restaurant_id: 'b' },
      { user_id: 'user-1', restaurant_id: 'c' },
    ],
  })
  expect(upserts[0].opts).toEqual({ onConflict: 'user_id,restaurant_id', ignoreDuplicates: true })
})

test('merging claims the first-save bonus once per restaurant', async () => {
  const { client, rpcs } = fakeClient()
  await mergeLocalSaves(client as never, 'user-1', ['a', 'b'])
  expect(rpcs).toEqual([
    ['claim_first_save', { p_restaurant: 'a' }],
    ['claim_first_save', { p_restaurant: 'b' }],
  ])
})

test('merging with no local saves does nothing', async () => {
  const { client, upserts, rpcs } = fakeClient()
  await mergeLocalSaves(client as never, 'user-1', [])
  expect(upserts).toHaveLength(0)
  expect(rpcs).toHaveLength(0)
})

test('a failing save upsert surfaces a readable error', async () => {
  const client = {
    from: () => ({ upsert: async () => ({ error: { message: 'denied' } }) }),
    rpc: async () => ({ data: 0, error: null }),
  }
  await expect(mergeLocalSaves(client as never, 'u', ['a'])).rejects.toThrow('Could not sync saves: denied')
})

import { delete_account } from './auth'

describe('delete_account', () => {
  test('asks the database to delete the signed-in person, then signs out', async () => {
    const calls: string[] = []
    const client = {
      rpc: async (fn: string) => {
        calls.push(`rpc:${fn}`)
        return { data: null, error: null }
      },
      auth: {
        signOut: async () => {
          calls.push('signOut')
          return { error: null }
        },
      },
    }
    await delete_account(client as never)
    expect(calls).toEqual(['rpc:delete_my_account', 'signOut'])
  })

  test('a database error is reported clearly and the person is not signed out', async () => {
    const client = {
      rpc: async () => ({ data: null, error: { message: 'boom' } }),
      auth: { signOut: vi.fn() },
    }
    await expect(delete_account(client as never)).rejects.toThrow('Could not delete your account: boom')
    expect(client.auth.signOut).not.toHaveBeenCalled()
  })
})
