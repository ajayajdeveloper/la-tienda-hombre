import { createSlice } from '@reduxjs/toolkit'

// Same cap as the API (MAX_QUANTITY_PER_LINE). The server re-checks anyway.
export const MAX_PER_LINE = 10

const initialState = { items: [], couponCode: null }

/**
 * The cart is CLIENT state: it exists before the server knows anything about
 * it. Each line stores a snapshot (name, price, image) so the cart drawer can
 * render instantly, even offline. The snapshot can go stale, which is why the
 * cart page and checkout show a server quote (/api/orders/quote) for the
 * real totals.
 */
const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    // Immer lets reducers "mutate" state; it produces a new immutable copy behind the scenes.
    addItem(state, action) {
      const { variantId, quantity = 1, stockQuantity } = action.payload
      const existing = state.items.find((item) => item.variantId === variantId)
      const limit = Math.min(MAX_PER_LINE, stockQuantity ?? MAX_PER_LINE)

      if (existing) {
        existing.quantity = Math.min(existing.quantity + quantity, limit)
        existing.stockQuantity = stockQuantity ?? existing.stockQuantity
      } else {
        state.items.unshift({ ...action.payload, quantity: Math.min(quantity, limit) })
      }
    },
    updateQuantity(state, action) {
      const { variantId, quantity } = action.payload
      const item = state.items.find((i) => i.variantId === variantId)
      if (!item) return
      const limit = Math.min(MAX_PER_LINE, item.stockQuantity ?? MAX_PER_LINE)
      item.quantity = Math.max(1, Math.min(quantity, limit))
    },
    removeItem(state, action) {
      state.items = state.items.filter((item) => item.variantId !== action.payload)
    },
    // Bring the cart in line with a server quote: drop lines that no longer
    // exist, clamp quantities to current stock, remove sold-out lines.
    reconcileWithQuote(state, action) {
      const { lines, unavailable } = action.payload
      const byId = new Map(lines.map((l) => [l.variantId, l]))
      state.items = state.items
        .filter((item) => !unavailable.includes(item.variantId))
        .map((item) => {
          const line = byId.get(item.variantId)
          if (!line) return item
          return {
            ...item,
            priceCents: line.priceCents,
            stockQuantity: line.available,
            quantity: Math.min(item.quantity, line.available),
          }
        })
        .filter((item) => item.quantity > 0)
    },
    applyCoupon(state, action) {
      state.couponCode = action.payload ? action.payload.trim().toUpperCase() : null
    },
    clearCart() {
      return initialState
    },
    // Replace the whole cart, e.g. with the copy another browser tab saved.
    hydrateCart(state, action) {
      return { ...initialState, ...action.payload }
    },
  },
})

export const {
  addItem, updateQuantity, removeItem, reconcileWithQuote, applyCoupon, clearCart, hydrateCart,
} = cartSlice.actions
export default cartSlice.reducer
