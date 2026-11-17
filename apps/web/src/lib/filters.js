// URL <-> filter state for the listing page. The URL is the single source of
// truth for filters: shareable links, working Back button, and a refresh that
// keeps your filters, all without any extra state.

// The API compares inclusively (min <= price <= max), so adjacent buckets must
// not share a boundary, or a ₹1,499 item would appear in two of them.
export const PRICE_BUCKETS = [
  { key: 'under-1000', label: 'Under ₹1,000', min: null, max: 99999 },
  { key: '1000-1499', label: '₹1,000 – ₹1,499', min: 100000, max: 149999 },
  { key: '1500-1999', label: '₹1,500 – ₹1,999', min: 150000, max: 199999 },
  { key: '2000-2999', label: '₹2,000 – ₹2,999', min: 200000, max: 299999 },
  { key: '3000-plus', label: '₹3,000 and above', min: 300000, max: null },
]

export const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Popularity' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Customer rating' },
  { value: 'discount', label: 'Biggest discount' },
]

const list = (value) => (value ? value.split(',').filter(Boolean) : [])
const num = (value) => (value != null && value !== '' && !Number.isNaN(Number(value)) ? Number(value) : undefined)

/** Read filters from URLSearchParams. */
export function readFilters(searchParams) {
  return {
    q: searchParams.get('q') ?? undefined,
    category: searchParams.get('category') ?? undefined,
    sizes: list(searchParams.get('sizes')),
    colors: list(searchParams.get('colors')),
    minPrice: num(searchParams.get('minPrice')),
    maxPrice: num(searchParams.get('maxPrice')),
    onSale: searchParams.get('onSale') === 'true',
    sort: searchParams.get('sort') ?? undefined,
    pages: Math.max(1, Math.min(20, num(searchParams.get('page')) ?? 1)),
  }
}

/**
 * Return new URLSearchParams with `changes` applied. Any filter change resets
 * pagination to page 1: "load more" results from the old filter don't belong
 * to the new one.
 */
export function updateParams(searchParams, changes) {
  const next = new URLSearchParams(searchParams)
  for (const [key, value] of Object.entries(changes)) {
    const empty = value == null || value === '' || value === false || (Array.isArray(value) && value.length === 0)
    if (empty) next.delete(key)
    else next.set(key, Array.isArray(value) ? value.join(',') : String(value))
  }
  if (!('page' in changes)) next.delete('page')
  return next
}

export function toggleInList(values, value) {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value]
}

export function activeBucket(filters) {
  return PRICE_BUCKETS.find((b) => (b.min ?? undefined) === filters.minPrice && (b.max ?? undefined) === filters.maxPrice)
}

export function countActiveFilters(filters) {
  return filters.sizes.length + filters.colors.length + (filters.minPrice != null || filters.maxPrice != null ? 1 : 0) + (filters.onSale ? 1 : 0)
}
