// Health check for the deployed site and its database. Read-only except one throwaway poll that is deleted again.
// Usage: npm run check:live            (uses https://what-we-eat.unidotcon.workers.dev)
//        npm run check:live -- https://other.address
// Needs .env (SUPABASE_SERVICE_KEY, only to delete the throwaway poll) and .env.local (VITE_SUPABASE_*). Never prints a secret.

function load_env() {
  for (const file of ['.env', '.env.local']) {
    try {
      process.loadEnvFile(file)
    } catch {
      // a missing file just means those values must already be in the environment
    }
  }
}

type Result = { name: string; ok: boolean; detail?: string }
const results: Result[] = []
const check = (name: string, ok: boolean, detail?: string) => results.push({ name, ok, detail })

async function main() {
  load_env()
  const site = (process.argv[2] ?? 'https://what-we-eat.unidotcon.workers.dev').replace(/\/$/, '')
  const db_url = process.env.VITE_SUPABASE_URL
  const anon_key = process.env.VITE_SUPABASE_ANON_KEY
  const service_key = process.env.SUPABASE_SERVICE_KEY
  if (!db_url || !anon_key) throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env.local')

  // ---- the website ----
  const home = await fetch(`${site}/`)
  check('home page answers 200', home.status === 200, String(home.status))
  const wanted_headers = [
    'content-security-policy',
    'x-content-type-options',
    'referrer-policy',
    'permissions-policy',
    'strict-transport-security',
    'cross-origin-opener-policy',
    'x-frame-options',
  ]
  const missing = wanted_headers.filter((h) => !home.headers.has(h))
  check('security headers present', missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : undefined)
  const csp = home.headers.get('content-security-policy') ?? ''
  check('CSP allows only our own database host, no wildcard', !csp.includes('*') && csp.includes(new URL(db_url).host))

  for (const path of ['/vote', '/saved', '/me', '/privacy', '/terms', '/p/abc1234567', '/sw.js', '/manifest.webmanifest']) {
    const r = await fetch(`${site}${path}`)
    check(`route ${path} answers 200`, r.status === 200, String(r.status))
  }

  const html = await home.text()
  const bundle_path = html.match(/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0]
  const bundle = bundle_path ? await (await fetch(`${site}/${bundle_path}`)).text() : ''
  check('built site contains the database address', bundle.includes(new URL(db_url).host))
  check('built site does not contain the secret key', !service_key || !bundle.includes(service_key))

  // ---- the database, as an anonymous visitor ----
  const anon = { apikey: anon_key, Authorization: `Bearer ${anon_key}`, 'Content-Type': 'application/json' }
  const call = (fn: string, body: unknown) => fetch(`${db_url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: anon, body: JSON.stringify(body) })

  const restaurants = (await (await fetch(`${db_url}/rest/v1/restaurants?select=id`, { headers: anon })).json()) as unknown[]
  check('restaurants are readable', Array.isArray(restaurants) && restaurants.length > 0, `${restaurants.length} rows`)

  for (const table of ['polls', 'poll_options', 'votes', 'points_ledger', 'saves']) {
    const rows = (await (await fetch(`${db_url}/rest/v1/${table}?select=*`, { headers: anon })).json()) as unknown
    check(`anonymous visitors cannot list ${table}`, Array.isArray(rows) && rows.length === 0)
  }
  // the spots table from migration 004 exists, and anonymous visitors are locked out of it
  const spots_res = await fetch(`${db_url}/rest/v1/spots?select=id&limit=1`, { headers: anon })
  check('migration 004 is applied (spots table exists)', spots_res.status !== 404, String(spots_res.status))
  check('anonymous visitors cannot read the spots table', spots_res.status === 401 || spots_res.status === 403, String(spots_res.status))
  for (const fn of ['grant_points', 'claim_first_save', 'my_points', 'delete_old_polls']) {
    const r = await call(fn, fn === 'grant_points' ? { p_user: '00000000-0000-0000-0000-000000000000', p_kind: 'review', p_restaurant: 'x' } : fn === 'claim_first_save' ? { p_restaurant: 'x' } : {})
    check(`anonymous visitors cannot call ${fn}`, r.status === 401 || r.status === 403, String(r.status))
  }

  // ---- a throwaway poll through the public functions ----
  const token = 'health-check-token-0000'
  const bad = await call('create_poll', { p_title: 'x', p_restaurant_ids: ['kopi-kin'], p_token: token })
  check('a poll with one place is rejected', bad.status === 400)
  const made = await call('create_poll', { p_title: 'health check', p_restaurant_ids: ['kopi-kin', 'long-table-hotpot'], p_token: token })
  const code = made.ok ? ((await made.json()) as string) : ''
  check('a valid poll can be created', code.length === 10, `code length ${code.length}`)
  if (code) {
    const poll = (await (await call('get_poll', { p_code: code })).json()) as { options: { id: string }[] } | null
    check('get_poll returns the poll', !!poll && poll.options.length === 2)
    if (poll) {
      const v = await call('cast_vote', { p_code: code, p_option: poll.options[0].id, p_token: token })
      check('a vote can be cast', v.status === 204, String(v.status))
      const again = await call('cast_vote', { p_code: code, p_option: poll.options[1].id, p_token: token })
      const after = (await (await call('get_poll', { p_code: code })).json()) as { votes: unknown[] }
      check('changing a vote does not add a second vote', again.status === 204 && after.votes.length === 1)
    }
    if (service_key) {
      const del = await fetch(`${db_url}/rest/v1/polls?code=eq.${code}`, { method: 'DELETE', headers: { apikey: service_key, Authorization: `Bearer ${service_key}` } })
      check('throwaway poll cleaned up', del.status === 204, String(del.status))
    } else {
      check('throwaway poll cleaned up', false, 'SUPABASE_SERVICE_KEY not set; delete poll ' + code + ' by hand')
    }
  }

  const failed = results.filter((r) => !r.ok)
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  (${r.detail})` : ''}`)
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`)
  process.exit(failed.length ? 1 : 0)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
