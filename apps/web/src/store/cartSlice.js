import { createSlice } from '@reduxjs/toolkit'

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: [],
  },
  reducers: {
    addItem(state, action) {
      const { variantId, quantity = 1 } = action.payload
      const existing = state.items.find((item) => item.variantId === variantId)

      if (existing) {
        existing.quantity += quantity
      } else {
        state.items.push({ ...action.payload, quantity })
      }
    },
    updateQuantity(state, action) {
      const { variantId, quantity } = action.payload
      const item = state.items.find((item) => item.variantId === variantId)
      if (item) {
        item.quantity = quantity
      }
    },
    removeItem(state, action) {
      state.items = state.items.filter((item) => item.variantId !== action.payload)
    },
    clearCart(state) {
      state.items = []
    },
  },
})

export const { addItem, updateQuantity, removeItem, clearCart } = cartSlice.actions
export default cartSlice.reducer
