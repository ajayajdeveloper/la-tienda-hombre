import { describe, expect, it } from 'vitest'
import reducer, { addItem, applyCoupon, reconcileWithQuote, removeItem, updateQuantity } from './cartSlice.js'
import { selectCartCount, selectCartSubtotal, selectOrderLines } from './cartSelectors.js'

// Reducers are pure functions: (state, action) -> new state. That makes them
// the easiest code in the app to test: no DOM, no network, no mocks.
const shirt = { variantId: 1, name: 'Shirt', priceCents: 149900, stockQuantity: 3 }
const tee = { variantId: 2, name: 'Tee', priceCents: 59900, stockQuantity: 20 }
const start = reducer(undefined, { type: '@@init' })

describe('cart reducer', () => {
  it('adds a new line with quantity 1, newest first', () => {
    const state = reducer(reducer(start, addItem(shirt)), addItem(tee))
    expect(state.items.map((i) => i.variantId)).toEqual([2, 1])
    expect(state.items[0].quantity).toBe(1)
  })

  it('increments an existing line instead of duplicating it', () => {
    const state = reducer(reducer(start, addItem(shirt)), addItem(shirt))
    expect(state.items).toHaveLength(1)
    expect(state.items[0].quantity).toBe(2)
  })

  it('never goes above the stock it knows about', () => {
    let state = start
    for (let i = 0; i < 5; i++) state = reducer(state, addItem(shirt))
    expect(state.items[0].quantity).toBe(3)
    state = reducer(state, updateQuantity({ variantId: 1, quantity: 99 }))
    expect(state.items[0].quantity).toBe(3)
  })

  it('never goes below 1 (removing is a separate action)', () => {
    const state = reducer(reducer(start, addItem(tee)), updateQuantity({ variantId: 2, quantity: 0 }))
    expect(state.items[0].quantity).toBe(1)
  })

  it('removes a line', () => {
    const state = reducer(reducer(start, addItem(tee)), removeItem(2))
    expect(state.items).toEqual([])
  })

  it('normalises coupon codes', () => {
    expect(reducer(start, applyCoupon('  welcome10 ')).couponCode).toBe('WELCOME10')
    expect(reducer(start, applyCoupon(null)).couponCode).toBeNull()
  })

  it('reconciles with a server quote: new prices, clamped quantities, dropped lines', () => {
    let state = reducer(start, addItem(shirt))
    state = reducer(state, updateQuantity({ variantId: 1, quantity: 3 }))
    state = reducer(state, addItem(tee))
    state = reducer(
      state,
      reconcileWithQuote({
        lines: [{ variantId: 1, priceCents: 129900, available: 2 }],
        unavailable: [2],
      })
    )
    expect(state.items).toEqual([expect.objectContaining({ variantId: 1, quantity: 2, priceCents: 129900, stockQuantity: 2 })])
  })

  it('drops a line whose stock fell to zero', () => {
    const state = reducer(reducer(start, addItem(tee)), reconcileWithQuote({ lines: [{ variantId: 2, priceCents: 59900, available: 0 }], unavailable: [] }))
    expect(state.items).toEqual([])
  })
})

describe('cart selectors', () => {
  const state = { cart: reducer(reducer(reducer(start, addItem(shirt)), addItem(shirt)), addItem(tee)) }

  it('counts units and sums the snapshot subtotal', () => {
    expect(selectCartCount(state)).toBe(3)
    expect(selectCartSubtotal(state)).toBe(149900 * 2 + 59900)
  })

  it('builds the order payload without client prices', () => {
    expect(selectOrderLines(state)).toEqual([
      { variantId: 2, quantity: 1 },
      { variantId: 1, quantity: 2 },
    ])
  })

  it('memoises: same input state -> same output reference', () => {
    expect(selectOrderLines(state)).toBe(selectOrderLines(state))
  })
})
