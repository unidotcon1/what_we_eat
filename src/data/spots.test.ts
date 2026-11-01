import { claim_points_for_new, fetch_remote_spots, push_changes, sync_spots } from './spots'
import { set_spot_state, type Spot } from '../domain/spots'

const t0 = '2026-11-01T10:00:00.000Z'
const t1 = '2026-11-02T10:00:00.000Z'
const kopi = { place_id: 'kopi-kin', name: 'Kopi & Kin', lat: 1.2862, lng: 103.8326, source: 'catalog' as const }
const manual = { place_id: null, name: 'Ah Ma Kitchen', lat: 1.3, lng: 103.85, source: 'manual' as const }

type Row = Spot & { user_id: string }

function fake_client(initial: Row[] = [], options: { fail?: string; reject?: (r: Row) => string | undefined } = {}) {
  const upsert_calls: number[] = []
  const table: Row[] = [...initial]
  const rpcs: [string, unknown][] = []
  const client = {
    from: () => ({
      select: () => ({
        eq: async (_col: string, user: string) =>
          options.fail ? { data: null, error: { message: options.fail } } : { data: table.filter((r) => r.user_id === user), error: null },
      }),
      upsert: async (rows: Row | Row[]) => {
        const list = Array.isArray(rows) ? rows : [rows]
        upsert_calls.push(list.length)
        const refused = list.map((r) => options.reject?.(r)).find(Boolean)
        if (refused) return { error: { message: refused } } // like Postgres: the whole call fails, nothing is written
        for (const r of list) {
          const i = table.findIndex((t) => t.user_id === r.user_id && t.id === r.id)
          if (i >= 0) table[i] = r
          else table.push(r)
        }
        return { error: null }
      },
      delete: () => ({
        eq: (_c1: string, user: string) => ({
          eq: async (_c2: string, id: string) => {
            const i = table.findIndex((t) => t.user_id === user && t.id === id)
            if (i >= 0) table.splice(i, 1)
            return { error: null }
          },
        }),
      }),
    }),
    rpc: async (fn: string, args: unknown) => {
      rpcs.push([fn, args])
      return { data: 5, error: null }
    },
  }
  return { client: client as never, table, rpcs, upsert_calls }
}

const row = (user: string, spot: Spot): Row => ({ ...spot, user_id: user })

test('fetch_remote_spots returns this user spots and drops malformed rows', async () => {
  const good = set_spot_state([], kopi, 'targeted', t0).spots[0]
  const { client } = fake_client([row('u1', good), row('u2', { ...good, id: 'r:other' }), { ...row('u1', good), id: 'r:bad', state: 'admin' as never }])
  expect((await fetch_remote_spots(client, 'u1')).map((s) => s.id)).toEqual(['r:kopi-kin'])
})

test('fetch_remote_spots turns a database error into a readable message', async () => {
  const { client } = fake_client([], { fail: 'relation "spots" does not exist' })
  await expect(fetch_remote_spots(client, 'u1')).rejects.toThrow('Could not load your spots: relation "spots" does not exist')
})

test('push_changes writes upserts with the user id and deletes by id', async () => {
  const a = set_spot_state([], kopi, 'targeted', t0).spots[0]
  const b = set_spot_state([], manual, 'targeted', t0).spots[0]
  const { client, table } = fake_client([row('u1', a)])
  await push_changes(client, 'u1', { upserts: [b], deletes: [a.id] })
  expect(table.map((r) => [r.user_id, r.id])).toEqual([['u1', b.id]])
})

test('push_changes with nothing to do makes no changes', async () => {
  const { client, table } = fake_client()
  await push_changes(client, 'u1', { upserts: [], deletes: [] })
  expect(table).toEqual([])
})

test('sync_spots merges device and account copies and writes up only what the account lacks or has older', async () => {
  const on_account = set_spot_state([], kopi, 'targeted', t0).spots[0]
  const on_device_newer = { ...on_account, state: 'conquered' as const, updated_at: t1, conquered_at: t1 }
  const only_on_device = set_spot_state([], manual, 'targeted', t0).spots[0]
  const { client, table } = fake_client([row('u1', on_account)])
  const merged = await sync_spots(client, 'u1', [on_device_newer, only_on_device])
  expect(merged).toHaveLength(2)
  expect(merged.find((s) => s.id === 'r:kopi-kin')?.state).toBe('conquered')
  expect(table.find((r) => r.id === 'r:kopi-kin')?.state).toBe('conquered')
  expect(table).toHaveLength(2)
})

test('sync_spots keeps an account-only spot on the device', async () => {
  const remote_only = set_spot_state([], kopi, 'conquered', t0).spots[0]
  const { client } = fake_client([row('u1', remote_only)])
  expect((await sync_spots(client, 'u1', [])).map((s) => s.id)).toEqual(['r:kopi-kin'])
})

test('sync_spots reports a database error instead of losing device data', async () => {
  const { client } = fake_client([], { fail: 'boom' })
  await expect(sync_spots(client, 'u1', [])).rejects.toThrow('Could not load your spots')
})

test('claim_points_for_new claims the first-spot bonus once per catalogue place and ignores manual places', async () => {
  const a = set_spot_state([], kopi, 'targeted', t0).spots[0]
  const b = set_spot_state([], manual, 'targeted', t0).spots[0]
  const { client, rpcs } = fake_client()
  await claim_points_for_new(client, [a, b])
  expect(rpcs).toEqual([['claim_first_save', { p_restaurant: 'kopi-kin' }]])
})

const many = (n: number): Spot[] =>
  Array.from({ length: n }, (_, i) => set_spot_state([], { place_id: null, name: `Place ${i}`, lat: 1.3, lng: 103.85, source: 'manual' }, 'targeted', t0).spots[0]).map((s, i) => ({ ...s, id: `m:${i}` }))

test('push_changes sends big batches in chunks, not one giant request', async () => {
  const { client, table, upsert_calls } = fake_client()
  await push_changes(client, 'u1', { upserts: many(450), deletes: [] })
  expect(table).toHaveLength(450)
  expect(upsert_calls).toEqual([200, 200, 50])
})

test('one refused row does not stop the others from being saved', async () => {
  const { client, table } = fake_client([], { reject: (r) => (r.id === 'm:3' ? 'new row violates check constraint' : undefined) })
  await expect(push_changes(client, 'u1', { upserts: many(10), deletes: [] })).rejects.toThrow(/Could not save 1 of 10/)
  expect(table.map((r) => r.id).sort()).toEqual(['m:0', 'm:1', 'm:2', 'm:4', 'm:5', 'm:6', 'm:7', 'm:8', 'm:9'])
})

test('a place that is no longer in our list is saved as a plain spot instead of failing', async () => {
  const a = set_spot_state([], kopi, 'targeted', t0).spots[0]
  const { client, table } = fake_client([], { reject: (r) => (r.place_id === 'kopi-kin' ? 'violates foreign key constraint' : undefined) })
  await push_changes(client, 'u1', { upserts: [a], deletes: [] })
  expect(table).toHaveLength(1)
  expect(table[0]).toMatchObject({ id: 'r:kopi-kin', place_id: null, name: 'Kopi & Kin' })
})

test('the error says how many could not be saved', async () => {
  const { client } = fake_client([], { reject: () => 'nope' })
  await expect(push_changes(client, 'u1', { upserts: many(3), deletes: [] })).rejects.toThrow('Could not save 3 of 3 spots: nope')
})
