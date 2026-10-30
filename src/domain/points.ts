export type PointKind = 'review' | 'submission' | 'first_save'

export const DAILY_CAP = 30
const VALUE: Record<PointKind, number> = { review: 5, submission: 5, first_save: 5 }

/** Points granted for one action, after the daily cap; a repeated first save earns nothing. */
export function awardPoints(todayTotal: number, kind: PointKind, alreadyHadFirstSave: boolean): number {
  if (kind === 'first_save' && alreadyHadFirstSave) return 0
  return Math.max(0, Math.min(VALUE[kind], DAILY_CAP - todayTotal))
}

const LEVELS = [
  { at: 0, name: 'Newcomer' },
  { at: 50, name: 'Food Explorer' },
  { at: 150, name: 'Regular' },
  { at: 400, name: 'Local Legend' },
]

export function levelFor(total: number): { level: number; name: string; nextAt: number | null } {
  let i = 0
  while (i + 1 < LEVELS.length && total >= LEVELS[i + 1].at) i++
  return { level: i + 1, name: LEVELS[i].name, nextAt: LEVELS[i + 1]?.at ?? null }
}

/** The calendar day (YYYY-MM-DD) in Singapore, used for the daily cap. */
export function sgDayKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore' }).format(d)
}
