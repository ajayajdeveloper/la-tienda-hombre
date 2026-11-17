import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit'
import { addItem, applyCoupon, clearCart, hydrateCart, reconcileWithQuote, removeItem, updateQuantity } from './cartSlice.js'
import { hydrateWishlist, toggleWishlist } from './wishlistSlice.js'
import { hydrateRecent, viewedProduct } from './recentSlice.js'
import { openOverlay } from './uiSlice.js'

// Versioned key: if the cart's shape ever changes incompatibly, bump the
// version and old saved carts are ignored instead of crashing the app.
const KEYS = {
  cart: 'lth:cart:v2',
  wishlist: 'lth:wishlist:v1',
  recent: 'lth:recent:v1',
}

export function loadPersisted() {
  const read = (key) => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : undefined
    } catch {
      return undefined // private mode, corrupted JSON, storage disabled
    }
  }
  const cart = read(KEYS.cart)
  return {
    cart: cart && Array.isArray(cart.items) ? cart : undefined,
    wishlist: read(KEYS.wishlist),
    recent: read(KEYS.recent),
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or blocked: the app still works, it just won't remember.
  }
}

/**
 * The listener middleware runs side effects in response to actions, outside
 * the reducers (reducers must stay pure: no localStorage, no timers).
 * v1 used store.subscribe, which ran on EVERY action, including every
 * API loading-state change. A listener runs only for the actions it names.
 */
export const listener = createListenerMiddleware()

const cartChanged = isAnyOf(addItem, updateQuantity, removeItem, reconcileWithQuote, applyCoupon, clearCart)

listener.startListening({
  matcher: cartChanged,
  effect: (action, api) => write(KEYS.cart, api.getState().cart),
})

listener.startListening({
  actionCreator: toggleWishlist,
  effect: (action, api) => write(KEYS.wishlist, api.getState().wishlist),
})

listener.startListening({
  actionCreator: viewedProduct,
  effect: (action, api) => write(KEYS.recent, api.getState().recent),
})

// Side effect as a reaction: adding to the cart opens the cart drawer. The
// product page only dispatches addItem; it doesn't need to know a drawer exists.
listener.startListening({
  actionCreator: addItem,
  effect: (action, api) => api.dispatch(openOverlay('cart')),
})

/**
 * Keep several tabs in sync. The `storage` event fires in every OTHER tab of
 * the same site when one tab writes to localStorage.
 */
export function syncAcrossTabs(store) {
  if (typeof window === 'undefined') return
  window.addEventListener('storage', (event) => {
    if (!event.newValue) return
    try {
      const value = JSON.parse(event.newValue)
      if (event.key === KEYS.cart) store.dispatch(hydrateCart(value))
      if (event.key === KEYS.wishlist) store.dispatch(hydrateWishlist(value))
      if (event.key === KEYS.recent) store.dispatch(hydrateRecent(value))
    } catch {
      // ignore malformed values written by something else
    }
  })
}
