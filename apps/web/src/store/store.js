import { configureStore } from '@reduxjs/toolkit'
import cartReducer from './cartSlice.js'

const CART_STORAGE_KEY = 'la-tienda-hombre-cart'

function loadCartState() {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY)
    return saved ? JSON.parse(saved) : undefined
  } catch {
    return undefined
  }
}

export const store = configureStore({
  reducer: {
    cart: cartReducer,
  },
  preloadedState: {
    cart: loadCartState() ?? { items: [] },
  },
})

store.subscribe(() => {
  const { cart } = store.getState()
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
})
