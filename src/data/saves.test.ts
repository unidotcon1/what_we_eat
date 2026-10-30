import { syncSave } from './saves'

function fakeClient() {
  const calls: [string, unknown][] = []
  const q = (op: string) => {
    const chain = {
      eq: (col: string, v: unknown) => {
        calls.push([`${op}.eq.${col}`, v])
        return chain
      },
      then: (ok: (v: unknown) => void) => ok({ error: null }),
    }
    return chain
  }
  const client = {
    from: (table: string) => ({
      upsert: async (row: unknown, opts: unknown) => {
        calls.push([`${table}.upsert`, { row, opts }])
        return { error: null }
      },
      delete: () => q(`${table}.delete`),
    }),
    rpc: async (fn: string, args: unknown) => {
      calls.push([fn, args])
      return { data: 5, error: null }
    },
  }
  return { client, calls }
}

test('saving while signed in writes the save row and claims the first-save bonus', async () => {
  const { client, calls } = fakeClient()
  await syncSave(client as never, 'u1', 'kopi-kin', true)
  expect(calls).toEqual([
    ['saves.upsert', { row: { user_id: 'u1', restaurant_id: 'kopi-kin' }, opts: { onConflict: 'user_id,restaurant_id', ignoreDuplicates: true } }],
    ['claim_first_save', { p_restaurant: 'kopi-kin' }],
  ])
})

test('unsaving while signed in deletes the save row and claims nothing', async () => {
  const { client, calls } = fakeClient()
  await syncSave(client as never, 'u1', 'kopi-kin', false)
  expect(calls).toEqual([
    ['saves.delete.eq.user_id', 'u1'],
    ['saves.delete.eq.restaurant_id', 'kopi-kin'],
  ])
})
