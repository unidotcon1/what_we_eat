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

test('my polls lists the most recently used first and never duplicates a poll', () => {
  rememberPoll('a1', 'Friday dinner', 'created')
  rememberPoll('b2', 'Date night', 'joined')
  rememberPoll('a1', 'Friday dinner', 'created')
  expect(listMyPolls()).toEqual([
    { code: 'a1', title: 'Friday dinner', role: 'created' },
    { code: 'b2', title: 'Date night', role: 'joined' },
  ])
})
