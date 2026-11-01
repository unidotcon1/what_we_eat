import { get_catalog, reset_catalog_cache_for_test } from './catalog'
import type { Restaurant } from '../domain/types'

const sample: Restaurant[] = [{ id: 'a', name: 'A', area: '', lat: 1, lng: 1, priceBand: 1, cuisine: 'Cafe', tags: [], closed: false }]

beforeEach(() => reset_catalog_cache_for_test())

test('the catalogue is fetched once and shared', async () => {
  const fetcher = vi.fn().mockResolvedValue(sample)
  expect(await get_catalog(fetcher)).toBe(sample)
  expect(await get_catalog(fetcher)).toBe(sample)
  expect(fetcher).toHaveBeenCalledTimes(1)
})

test('a failed fetch is not remembered, so the next call tries again', async () => {
  const fetcher = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(sample)
  await expect(get_catalog(fetcher)).rejects.toThrow('offline')
  expect(await get_catalog(fetcher)).toBe(sample)
  expect(fetcher).toHaveBeenCalledTimes(2)
})
