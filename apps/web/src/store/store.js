import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import { api } from './apiSlice.js'
import cartReducer from './cartSlice.js'
import wishlistReducer from './wishlistSlice.js'
import recentReducer from './recentSlice.js'
import uiReducer from './uiSlice.js'
import { listener, loadPersisted, syncAcrossTabs } from './persistence.js'

export function makeStore(preloadedState = loadPersisted()) {
  const store = configureStore({
    reducer: {
      [api.reducerPath]: api.reducer,
      cart: cartReducer,
      wishlist: wishlistReducer,
      recent: recentReducer,
      ui: uiReducer,
    },
    preloadedState: Object.fromEntries(Object.entries(preloadedState).filter(([, v]) => v !== undefined)),
    // prepend: the listener sees actions before other middleware.
    // api.middleware handles caching, invalidation and polling for RTK Query.
    middleware: (getDefault) => getDefault().prepend(listener.middleware).concat(api.middleware),
  })

  // Refetch stale queries when the tab regains focus or the network reconnects.
  setupListeners(store.dispatch)
  syncAcrossTabs(store)
  return store
}

export const store = makeStore()
