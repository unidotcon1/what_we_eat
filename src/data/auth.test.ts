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

import { delete_account, signOut } from './auth'
import * as supabase from './supabase'
import { getLocalSaves } from '../local/store'
import { get_spots, reset_spots_store_for_test, set_spots } from '../local/spots_store'
import { clear_sync_problem, report_sync_problem } from '../local/sync_status'
import type { Spot } from '../domain/spots'

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

describe('signOut', () => {
  const spot: Spot = {
    id: 'r:kopi-kin',
    place_id: 'kopi-kin',
    name: 'Kopi & Kin',
    address: '',
    lat: 1.2862,
    lng: 103.8326,
    state: 'targeted',
    source: 'catalog',
    created_at: '2026-11-01T10:00:00.000Z',
    updated_at: '2026-11-01T10:00:00.000Z',
    conquered_at: null,
  }

  beforeEach(() => {
    localStorage.clear()
    reset_spots_store_for_test()
    clear_sync_problem()
    vi.spyOn(supabase, 'getClient').mockReturnValue({ auth: { signOut: vi.fn().mockResolvedValue({ error: null }) } } as never)
  })
  afterEach(() => vi.restoreAllMocks())

  test('signing out clears the spots and old hearts kept on this phone, so the next person to sign in does not inherit them', async () => {
    set_spots([spot])
    localStorage.setItem('wwe.saves', JSON.stringify(['kopi-kin']))
    await signOut()
    expect(get_spots()).toEqual([])
    expect(getLocalSaves()).toEqual([])
  })

  test('but if the last save to the account failed, the spots stay so nothing is lost', async () => {
    set_spots([spot])
    report_sync_problem(new Error('x'))
    await signOut()
    expect(get_spots()).toHaveLength(1)
  })

  test('if signing out itself fails, nothing is cleared', async () => {
    set_spots([spot])
    vi.spyOn(supabase, 'getClient').mockReturnValue({ auth: { signOut: vi.fn().mockRejectedValue(new Error('offline')) } } as never)
    await expect(signOut()).rejects.toThrow('offline')
    expect(get_spots()).toHaveLength(1)
  })
})
