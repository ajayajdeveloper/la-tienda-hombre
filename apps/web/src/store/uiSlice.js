import { createSlice } from '@reduxjs/toolkit'

// Which overlay is open. They are mutually exclusive: opening one closes the
// others, so there is never a cart drawer on top of a search overlay.
// Lives in Redux (not local state) because the triggers are far apart:
// "Add to cart" on the product page opens a drawer rendered by the layout.
const uiSlice = createSlice({
  name: 'ui',
  initialState: { overlay: null, toast: null },
  reducers: {
    openOverlay(state, action) {
      state.overlay = action.payload // 'cart' | 'search' | 'menu'
    },
    closeOverlay(state) {
      state.overlay = null
    },
    showToast: {
      // `prepare` adds a unique id, so two identical messages in a row still re-trigger the toast.
      reducer(state, action) {
        state.toast = action.payload
      },
      prepare(message, tone = 'info') {
        return { payload: { id: Date.now() + Math.random(), message, tone } }
      },
    },
    dismissToast(state) {
      state.toast = null
    },
  },
})

export const { openOverlay, closeOverlay, showToast, dismissToast } = uiSlice.actions
export const selectOverlay = (state) => state.ui.overlay
export const selectToast = (state) => state.ui.toast
export default uiSlice.reducer
