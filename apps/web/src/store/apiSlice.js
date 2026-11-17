import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

// Empty in dev and in the single-origin production setup (requests go to
// /api on the same host). Set VITE_API_URL only when the API lives on another
// domain, e.g. https://api.example.com.
const API_BASE = `${import.meta.env.VITE_API_URL ?? ''}/api`

/**
 * RTK Query owns all SERVER state: data that lives in Postgres and that the
 * browser only borrows. It caches each response by its arguments, shares one
 * request between every component that asks for the same data, tracks
 * loading/error states, and refetches when a mutation invalidates a tag.
 * The hand-written useEffect + useState + cancelled-flag pattern from v1 is
 * what this replaces.
 *
 * CLIENT state (cart, wishlist, open drawers) stays in normal slices.
 */
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE }),
  // Cached data is kept for 2 minutes after the last component using it unmounts,
  // so going back to a listing is instant.
  keepUnusedDataFor: 120,
  tagTypes: ['Product', 'Reviews', 'Order'],
  endpoints: (build) => ({
    getSettings: build.query({ query: () => 'settings', keepUnusedDataFor: 3600 }),
    getCategories: build.query({ query: () => 'categories', keepUnusedDataFor: 3600 }),
    getCollections: build.query({ query: () => 'collections', keepUnusedDataFor: 3600 }),
    getCollection: build.query({ query: (slug) => `collections/${slug}` }),

    getProducts: build.query({
      query: (params) => ({ url: 'products', params: cleanParams(params) }),
      providesTags: ['Product'],
    }),
    getProduct: build.query({
      query: (slug) => `products/${slug}`,
      providesTags: (result, error, slug) => [{ type: 'Product', id: slug }],
    }),
    getSimilar: build.query({ query: (slug) => `products/${slug}/similar` }),

    getReviews: build.query({
      query: ({ slug, page = 1, sort = 'newest' }) => ({ url: `products/${slug}/reviews`, params: { page, sort } }),
      providesTags: (result, error, { slug }) => [{ type: 'Reviews', id: slug }],
    }),
    addReview: build.mutation({
      query: ({ slug, ...body }) => ({ url: `products/${slug}/reviews`, method: 'POST', body }),
      // A new review changes the review list AND the product's rating, so both refetch.
      invalidatesTags: (result, error, { slug }) => [
        { type: 'Reviews', id: slug },
        { type: 'Product', id: slug },
      ],
    }),

    suggest: build.query({ query: (q) => ({ url: 'search/suggest', params: { q } }) }),
    getCoupons: build.query({ query: () => 'coupons', keepUnusedDataFor: 600 }),
    checkDelivery: build.query({ query: (pincode) => `delivery/${pincode}` }),

    quote: build.query({
      query: (body) => ({ url: 'orders/quote', method: 'POST', body }),
      keepUnusedDataFor: 0, // prices/stock must be fresh, never served from an old cache
    }),
    placeOrder: build.mutation({
      query: ({ idempotencyKey, ...body }) => ({
        url: 'orders',
        method: 'POST',
        body,
        headers: { 'Idempotency-Key': idempotencyKey },
      }),
      // Stock and sold counts changed, so cached listings are now stale.
      invalidatesTags: ['Product'],
    }),
    getOrder: build.query({
      query: (publicId) => `orders/${publicId}`,
      providesTags: (result, error, id) => [{ type: 'Order', id }],
    }),

    notifyMe: build.mutation({
      query: (body) => ({ url: 'stock-notifications', method: 'POST', body }),
    }),
  }),
})

/** Drop empty values and join arrays, so the URL stays clean and the cache key stable. */
export function cleanParams(params = {}) {
  const out = {}
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === '' || value === false) continue
    if (Array.isArray(value)) {
      if (value.length) out[key] = value.join(',')
    } else {
      out[key] = value
    }
  }
  return out
}

/** Pull a readable message out of an RTK Query error. */
export function errorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return null
  if (error.status === 'FETCH_ERROR') return 'Cannot reach the store. Check your connection.'
  return error.data?.error ?? fallback
}

export const {
  useGetSettingsQuery,
  useGetCategoriesQuery,
  useGetCollectionsQuery,
  useGetCollectionQuery,
  useGetProductsQuery,
  useGetProductQuery,
  useGetSimilarQuery,
  useGetReviewsQuery,
  useAddReviewMutation,
  useSuggestQuery,
  useGetCouponsQuery,
  useLazyCheckDeliveryQuery,
  useQuoteQuery,
  usePlaceOrderMutation,
  useGetOrderQuery,
  useNotifyMeMutation,
} = api
