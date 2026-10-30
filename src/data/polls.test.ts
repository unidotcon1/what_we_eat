import { listMyPolls, localPolls, rememberPoll, supabasePolls, type PollApi } from './polls'

beforeEach(() => localStorage.clear())

async function newPoll(api: PollApi = localPolls()) {
  const code = await api.create('Friday dinner', ['kopi-kin', 'long-table-hotpot'], 'creator')
  const view = (await api.get(code))!
  return { api, code, view }
}

test('create returns a code and get returns the title and options in order', async () => {
  const { view } = await newPoll()
  expect(view.title).toBe('Friday dinner')
  expect(view.options.map((o) => o.restaurantId)).toEqual(['kopi-kin', 'long-table-hotpot'])
  expect(view.closed).toBe(false)
})

test('get returns null for an unknown code', async () => {
  expect(await localPolls().get('nope')).toBeNull()
})

test('the same voter voting twice counts once, for the latest choice', async () => {
  const { api, code, view } = await newPoll()
  await api.vote(code, view.options[0].id, 'voter-1')
  await api.vote(code, view.options[1].id, 'voter-1')
  const after = (await api.get(code))!
  expect(after.votes).toEqual([{ optionId: view.options[1].id }])
  expect(await api.myVote(code, 'voter-1')).toBe(view.options[1].id)
})

test('different voters are counted separately', async () => {
  const { api, code, view } = await newPoll()
  await api.vote(code, view.options[0].id, 'a')
  await api.vote(code, view.options[0].id, 'b')
  expect((await api.get(code))!.votes).toHaveLength(2)
})

test('voting on a closed poll is rejected', async () => {
  const { api, code, view } = await newPoll()
  await api.close(code, 'creator')
  await expect(api.vote(code, view.options[0].id, 'x')).rejects.toThrow('poll is closed')
})

test('only the creator token can close a poll', async () => {
  const { api, code } = await newPoll()
  await api.close(code, 'someone-else')
  expect((await api.get(code))!.closed).toBe(false)
  await api.close(code, 'creator')
  expect((await api.get(code))!.closed).toBe(true)
})

test('isCreator is true only for the token that created the poll', async () => {
  const { api, code } = await newPoll()
  expect(await api.isCreator(code, 'creator')).toBe(true)
  expect(await api.isCreator(code, 'someone-else')).toBe(false)
})

test('joining a poll you created keeps its role as created', () => {
  rememberPoll('a1', 'Friday dinner', 'created')
  rememberPoll('a1', 'Friday dinner', 'joined')
  expect(listMyPolls()[0].role).toBe('created')
})

test('voting for an option that is not in the poll is rejected', async () => {
  const { api, code } = await newPoll()
  await expect(api.vote(code, 'not-an-option', 'x')).rejects.toThrow('unknown option')
})

test('supabasePolls calls the matching rpc functions with the token', async () => {
  const calls: [string, unknown][] = []
  const client = {
    rpc: async (fn: string, args: unknown) => {
      calls.push([fn, args])
      if (fn === 'create_poll') return { data: 'abc123', error: null }
      if (fn === 'cast_vote') return { data: null, error: { message: 'poll is closed' } }
      return { data: null, error: null }
    },
  }
  const api = supabasePolls(client as never)
  expect(await api.create('T', ['a'], 'tok')).toBe('abc123')
  expect(calls[0]).toEqual(['create_poll', { p_title: 'T', p_restaurant_ids: ['a'], p_token: 'tok' }])
  await expect(api.vote('abc123', 'opt', 'tok')).rejects.toThrow('poll is closed')
  expect(calls[1]).toEqual(['cast_vote', { p_code: 'abc123', p_option: 'opt', p_token: 'tok' }])
})

test('supabasePolls.get reads the poll through the get_poll function and maps its fields', async () => {
  const calls: [string, unknown][] = []
  const client = {
    rpc: async (fn: string, args: unknown) => {
      calls.push([fn, args])
      return {
        data: {
          code: 'abc1234567',
          title: 'Friday dinner',
          closed: false,
          options: [{ id: 'o1', restaurant_id: 'kopi-kin' }],
          votes: [{ option_id: 'o1' }],
        },
        error: null,
      }
    },
  }
  const view = await supabasePolls(client as never).get('abc1234567')
  expect(calls).toEqual([['get_poll', { p_code: 'abc1234567' }]])
  expect(view).toEqual({
    code: 'abc1234567',
    title: 'Friday dinner',
    closed: false,
    options: [{ id: 'o1', restaurantId: 'kopi-kin' }],
    votes: [{ optionId: 'o1' }],
  })
})

test('supabasePolls.get returns null for an unknown poll', async () => {
  const client = { rpc: async () => ({ data: null, error: null }) }
  expect(await supabasePolls(client as never).get('nope')).toBeNull()
})

test('supabasePolls.subscribe refreshes every few seconds and stops when unsubscribed', () => {
  vi.useFakeTimers()
  const cb = vi.fn()
  const stop = supabasePolls({} as never).subscribe('abc', cb)
  vi.advanceTimersByTime(3100)
  expect(cb).toHaveBeenCalledTimes(1)
  stop()
  vi.advanceTimersByTime(10000)
  expect(cb).toHaveBeenCalledTimes(1)
  vi.useRealTimers()
})

test('corrupt device-poll storage is ignored instead of crashing', async () => {
  for (const bad of ['[]', '"text"', '42', 'null', '{not json']) {
    localStorage.setItem('wwe.localpolls', bad)
    expect(await localPolls().get('anything')).toBeNull()
  }
})

test('corrupt my-polls storage yields an empty list, and invalid entries are dropped', () => {
  for (const bad of ['{"a":1}', '"x"', '42', 'null', '{not json']) {
    localStorage.setItem('wwe.mypolls', bad)
    expect(listMyPolls()).toEqual([])
  }
  localStorage.setItem(
    'wwe.mypolls',
    JSON.stringify([1, 'x', { code: 'a' }, { code: 'b', title: 'Good', role: 'created' }, { code: 'c', title: 'Bad role', role: 'admin' }]),
  )
  expect(listMyPolls()).toEqual([{ code: 'b', title: 'Good', role: 'created' }])
})

test('my polls lists the most recently used first and never duplicates a poll', () => {
  rememberPoll('a1', 'Friday dinner', 'created')
  rememberPoll('b2', 'Date night', 'joined')
  rememberPoll('a1', 'Friday dinner', 'created')
  expect(listMyPolls()).toEqual([
    { code: 'a1', title: 'Friday dinner', role: 'created' },
    { code: 'b2', title: 'Date night', role: 'joined' },
  ])
})
