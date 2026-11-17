import { createSelector } from '@reduxjs/toolkit'

export const selectCartItems = (state) => state.cart.items
export const selectCouponCode = (state) => state.cart.couponCode

// createSelector memoises: the reduce only reruns when `items` is a new array,
// and components get the same result object between renders (no extra re-renders).
export const selectCartCount = createSelector([selectCartItems], (items) =>
  items.reduce((count, item) => count + item.quantity, 0)
)

/** Snapshot subtotal for instant UI (drawer, progress bar). Checkout uses the server quote. */
export const selectCartSubtotal = createSelector([selectCartItems], (items) =>
  items.reduce((total, item) => total + item.priceCents * item.quantity, 0)
)

/** The payload shape the API's /orders/quote and /orders endpoints expect. */
export const selectOrderLines = createSelector([selectCartItems], (items) =>
  items.map(({ variantId, quantity }) => ({ variantId, quantity }))
)

export const selectCartVariantIds = createSelector([selectCartItems], (items) =>
  items.map((item) => item.variantId)
)
