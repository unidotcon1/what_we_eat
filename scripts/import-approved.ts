import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import type { Restaurant } from '../src/domain/types'
import { parseCsv, parseRestaurantRow } from './seed'

export type ImportDeps = {
  upsertRestaurant(r: Restaurant): Promise<void>
  findUserIdByEmail(email: string): Promise<string | null>
  grantSubmissionPoints(userId: string, restaurantId: string): Promise<void>
}

/** Rows are approved Google Form responses: the seed columns plus the submitter's email. */
export async function importApproved(
  rows: Record<string, string>[],
  deps: ImportDeps,
): Promise<{ imported: number; skipped: string[] }> {
  let imported = 0
  const skipped: string[] = []
  for (const [i, row] of rows.entries()) {
    const parsed = parseRestaurantRow(row)
    if ('skip' in parsed) {
      skipped.push(`row ${i + 1}: ${parsed.skip}`)
      continue
    }
    await deps.upsertRestaurant(parsed)
    imported++
    const userId = await deps.findUserIdByEmail((row.email ?? '').trim().toLowerCase())
    if (userId) await deps.grantSubmissionPoints(userId, parsed.id)
  }
  return { imported, skipped }
}

async function main() {
  const file = process.argv[2]
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!file || !url || !key) {
    console.error('usage: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx tsx scripts/import-approved.ts approved.csv')
    process.exit(1)
  }
  const { createClient } = await import('@supabase/supabase-js')
  const db = createClient(url, key)
  const result = await importApproved(parseCsv(readFileSync(file, 'utf8')), {
    async upsertRestaurant(r) {
      const { error } = await db.from('restaurants').upsert({
        id: r.id,
        name: r.name,
        area: r.area,
        lat: r.lat,
        lng: r.lng,
        price_band: r.priceBand,
        cuisine: r.cuisine,
        tags: r.tags,
        hours: r.hours ?? null,
        closed: r.closed,
      })
      if (error) throw error
    },
    async findUserIdByEmail(email) {
      const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 })
      if (error) throw error
      return data.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null
    },
    async grantSubmissionPoints(userId, restaurantId) {
      const { error } = await db.rpc('grant_points', { p_user: userId, p_kind: 'submission', p_restaurant: restaurantId })
      if (error) throw error
    },
  })
  console.log(`imported ${result.imported}`)
  result.skipped.forEach((s) => console.warn(`skipped ${s}`))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
