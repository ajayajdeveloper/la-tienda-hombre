import { createSelector } from '@reduxjs/toolkit'

const selectCartItems = (state) => state.cart.items

export const selectCartTotalCents = createSelector(
  [selectCartItems],
  (items) => items.reduce((total, item) => total + item.priceCents * item.quantity, 0)
)

export const selectCartItemCount = createSelector(
  [selectCartItems],
  (items) => items.reduce((count, item) => count + item.quantity, 0)
)
