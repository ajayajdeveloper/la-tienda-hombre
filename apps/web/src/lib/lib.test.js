import { describe, expect, it } from 'vitest'
import { activeBucket, countActiveFilters, readFilters, toggleInList, updateParams } from './filters.js'
import { discountPercent, formatPrice } from './format.js'
import { cleanParams } from '../store/apiSlice.js'

describe('filters <-> URL', () => {
  it('reads lists, numbers and booleans from the query string', () => {
    const f = readFilters(new URLSearchParams('sizes=M,L&colors=Navy&minPrice=99900&onSale=true&page=3'))
    expect(f).toMatchObject({ sizes: ['M', 'L'], colors: ['Navy'], minPrice: 99900, onSale: true, pages: 3 })
  })

  it('ignores junk', () => {
    const f = readFilters(new URLSearchParams('minPrice=abc&page=-4'))
    expect(f.minPrice).toBeUndefined()
    expect(f.pages).toBe(1)
  })

  it('resets pagination when a filter changes, removes empty values', () => {
    const next = updateParams(new URLSearchParams('sizes=M&page=4&sort=newest'), { sizes: [] })
    expect(next.toString()).toBe('sort=newest')
  })

  it('keeps pagination when the change IS the page', () => {
    const next = updateParams(new URLSearchParams('sizes=M'), { page: 2 })
    expect(next.get('page')).toBe('2')
  })

  it('toggles list membership', () => {
    expect(toggleInList(['M'], 'L')).toEqual(['M', 'L'])
    expect(toggleInList(['M', 'L'], 'M')).toEqual(['L'])
  })

  it('recognises a price bucket and counts active filters', () => {
    const f = readFilters(new URLSearchParams('maxPrice=99999&sizes=M,L'))
    expect(activeBucket(f)?.key).toBe('under-1000')
    expect(countActiveFilters(f)).toBe(3)
  })
})

describe('price buckets', () => {
  it('never share a boundary (the API compares inclusively)', async () => {
    const { PRICE_BUCKETS } = await import('./filters.js')
    for (let i = 1; i < PRICE_BUCKETS.length; i++) {
      expect(PRICE_BUCKETS[i].min).toBeGreaterThan(PRICE_BUCKETS[i - 1].max)
    }
  })
})

describe('formatting', () => {
  it('formats paise as rupees with Indian digit grouping', () => {
    expect(formatPrice(149900)).toBe('₹1,499')
    expect(formatPrice(12990000)).toBe('₹1,29,900')
  })

  it('rounds discounts down', () => {
    expect(discountPercent(149900, 199900)).toBe(25) // 25.01% -> 25
    expect(discountPercent(100, null)).toBe(0)
  })
})

describe('cleanParams', () => {
  it('drops empty values so equal filters produce equal cache keys', () => {
    expect(cleanParams({ a: '', b: null, c: [], d: false, e: ['M', 'L'], f: 0, g: 'x' })).toEqual({ e: 'M,L', f: 0, g: 'x' })
  })
})
