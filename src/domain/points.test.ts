import { awardPoints, levelFor, sgDayKey, DAILY_CAP } from './points'

test('a review is worth 5 points when under the daily cap', () => {
  expect(awardPoints(25, 'review', false)).toBe(5)
})

test('at the daily cap nothing more is awarded', () => {
  expect(awardPoints(30, 'review', false)).toBe(0)
  expect(DAILY_CAP).toBe(30)
})

test('just under the cap only the remaining points are awarded', () => {
  expect(awardPoints(29, 'review', false)).toBe(1)
})

test('a first save already earned before gives nothing, even with room under the cap', () => {
  expect(awardPoints(0, 'first_save', true)).toBe(0)
})

test('a first save, a submission and a review are each worth 5', () => {
  expect(awardPoints(0, 'first_save', false)).toBe(5)
  expect(awardPoints(0, 'submission', false)).toBe(5)
  expect(awardPoints(0, 'review', false)).toBe(5)
})

test('a first save that does not fully fit under the cap earns nothing, so it can be claimed in full another day', () => {
  expect(awardPoints(29, 'first_save', false)).toBe(0)
  expect(awardPoints(25, 'first_save', false)).toBe(5)
})

test('levelFor uses thresholds 50, 150 and 400', () => {
  expect(levelFor(0)).toMatchObject({ level: 1, nextAt: 50 })
  expect(levelFor(49).level).toBe(1)
  expect(levelFor(50)).toMatchObject({ level: 2, nextAt: 150, name: 'Food Explorer' })
  expect(levelFor(150).level).toBe(3)
  expect(levelFor(399).level).toBe(3)
  expect(levelFor(400).level).toBe(4)
  expect(levelFor(400).nextAt).toBeNull()
})

test('the daily window rolls over at midnight Singapore time', () => {
  expect(sgDayKey(new Date('2026-10-30T23:59:00+08:00'))).toBe('2026-10-30')
  expect(sgDayKey(new Date('2026-10-31T00:00:00+08:00'))).toBe('2026-10-31')
  expect(sgDayKey(new Date('2026-10-30T16:00:00Z'))).toBe('2026-10-31')
})
