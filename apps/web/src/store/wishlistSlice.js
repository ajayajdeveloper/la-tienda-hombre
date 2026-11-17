import { createSlice } from '@reduxjs/toolkit'

// Stores product IDs only, newest first. Card data (price, stock, images) is
// fetched fresh with GET /api/products?ids=..., so the wishlist never shows a
// stale price the way a stored snapshot would.
const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: { ids: [] },
  reducers: {
    toggleWishlist(state, action) {
      const id = action.payload
      state.ids = state.ids.includes(id) ? state.ids.filter((x) => x !== id) : [id, ...state.ids].slice(0, 100)
    },
    hydrateWishlist(state, action) {
      state.ids = action.payload.ids ?? []
    },
  },
})

export const { toggleWishlist, hydrateWishlist } = wishlistSlice.actions
export const selectWishlistIds = (state) => state.wishlist.ids
export const selectIsWishlisted = (id) => (state) => state.wishlist.ids.includes(id)
export default wishlistSlice.reducer
