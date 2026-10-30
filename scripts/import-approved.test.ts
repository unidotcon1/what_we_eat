import { importApproved, type ImportDeps } from './import-approved'

const row = {
  email: 'sam@example.com',
  name: 'Nasi Corner 2',
  area: 'Geylang',
  lat: '1.315',
  lng: '103.887',
  price_band: '1',
  cuisine: 'Malay',
  tags: 'group|halal',
  hours: '',
  closed: '',
}

function deps(users: Record<string, string> = { 'sam@example.com': 'user-1' }) {
  const upserted: string[] = []
  const granted: [string, string, string][] = []
  const d: ImportDeps = {
    upsertRestaurant: async (r) => {
      upserted.push(r.id)
    },
    findUserIdByEmail: async (email) => users[email.toLowerCase()] ?? null,
    grantSubmissionPoints: async (userId, restaurantId) => {
      granted.push([userId, 'submission', restaurantId])
    },
  }
  return { d, upserted, granted }
}

test('an approved row is imported and the submitter gets submission points', async () => {
  const { d, upserted, granted } = deps()
  const out = await importApproved([row], d)
  expect(out).toMatchObject({ imported: 1, skipped: [] })
  expect(upserted).toEqual(['nasi-corner-2'])
  expect(granted).toEqual([['user-1', 'submission', 'nasi-corner-2']])
})

test('a row whose email has no account is imported without points', async () => {
  const { d, granted } = deps({})
  const out = await importApproved([row], d)
  expect(out.imported).toBe(1)
  expect(granted).toHaveLength(0)
})

test('email matching ignores case and spaces', async () => {
  const { d, granted } = deps()
  await importApproved([{ ...row, email: '  SAM@Example.com ' }], d)
  expect(granted).toHaveLength(1)
})

test('a row without a name is skipped with a reason and the rest still import', async () => {
  const { d, upserted } = deps()
  const out = await importApproved([{ ...row, name: '' }, row], d)
  expect(out.imported).toBe(1)
  expect(out.skipped).toEqual(['row 1: missing name'])
  expect(upserted).toEqual(['nasi-corner-2'])
})

test('the Google Form "Email Address" column is understood', async () => {
  const { d, granted } = deps()
  const { email, ...rest } = row
  await importApproved([{ ...rest, 'Email Address': email }], d)
  expect(granted).toHaveLength(1)
})

test('a row whose email matches no account is reported as a warning', async () => {
  const { d } = deps({})
  const out = await importApproved([row], d)
  expect(out.warnings).toEqual(['row 1: no account for sam@example.com, so no points were granted'])
})

test('a database error on one row is reported and the remaining rows still import', async () => {
  const { d, upserted } = deps()
  const failing: ImportDeps = {
    ...d,
    upsertRestaurant: async (r) => {
      if (r.name === 'Boom') throw new Error('db down')
      upserted.push(r.id)
    },
  }
  const out = await importApproved([{ ...row, name: 'Boom' }, row], failing)
  expect(out.imported).toBe(1)
  expect(out.skipped).toEqual(['row 1: db down'])
})

test('a row with a blank price is skipped, not imported', async () => {
  const { d, upserted } = deps()
  const out = await importApproved([{ ...row, price_band: '' }], d)
  expect(out.skipped).toEqual(['row 1: missing price_band'])
  expect(upserted).toHaveLength(0)
})
