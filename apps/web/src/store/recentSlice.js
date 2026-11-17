import { createSlice } from '@reduxjs/toolkit'

const MAX_RECENT = 12

const recentSlice = createSlice({
  name: 'recent',
  initialState: { ids: [] },
  reducers: {
    // Move the product to the front; keep the list short.
    viewedProduct(state, action) {
      const id = action.payload
      state.ids = [id, ...state.ids.filter((x) => x !== id)].slice(0, MAX_RECENT)
    },
    hydrateRecent(state, action) {
      state.ids = action.payload.ids ?? []
    },
  },
})

export const { viewedProduct, hydrateRecent } = recentSlice.actions
export const selectRecentIds = (state) => state.recent.ids
export default recentSlice.reducer
