import './setup.js'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { computeTotals, evaluateCoupon, shippingFor } from '../src/lib/pricing.js'
import { estimateDate } from '../src/services/delivery.js'

const percent10 = {
  is_active: true, discount_type: 'percent', discount_value: 10,
  max_discount_cents: 30000, min_subtotal_cents: 99900, usage_limit: null, times_used: 0,
}

describe('evaluateCoupon', () => {
  it('applies a percentage and rounds down', () => {
    assert.deepEqual(evaluateCoupon(percent10, 129999), { ok: true, discountCents: 12999 })
  })

  it('caps a percentage at max_discount_cents', () => {
    assert.equal(evaluateCoupon(percent10, 1_000_000).discountCents, 30000)
  })

  it('rejects below the minimum and says how much is missing', () => {
    const result = evaluateCoupon(percent10, 90000)
    assert.equal(result.ok, false)
    assert.equal(result.shortByCents, 9900)
  })

  it('rejects expired, not-yet-started and exhausted coupons', () => {
    const now = new Date('2026-01-01')
    assert.equal(evaluateCoupon({ ...percent10, expires_at: '2025-12-31' }, 200000, now).ok, false)
    assert.equal(evaluateCoupon({ ...percent10, starts_at: '2026-02-01' }, 200000, now).ok, false)
    assert.equal(evaluateCoupon({ ...percent10, usage_limit: 5, times_used: 5 }, 200000, now).ok, false)
  })

  it('never discounts more than the subtotal', () => {
    const flat = { ...percent10, discount_type: 'flat', discount_value: 50000, min_subtotal_cents: 0 }
    assert.equal(evaluateCoupon(flat, 30000).discountCents, 30000)
  })

  it('rejects a missing or inactive coupon', () => {
    assert.equal(evaluateCoupon(undefined, 1000).ok, false)
    assert.equal(evaluateCoupon({ ...percent10, is_active: false }, 200000).ok, false)
  })
})

describe('shipping and totals', () => {
  it('is free at or above the threshold', () => {
    assert.equal(shippingFor(99900), 0)
    assert.equal(shippingFor(99899), 7900)
  })

  it('judges free shipping on the amount AFTER discount', () => {
    // ₹1,099 - ₹200 = ₹899 -> below ₹999, so shipping is charged.
    assert.deepEqual(computeTotals({ subtotalCents: 109900, discountCents: 20000 }), {
      subtotalCents: 109900, discountCents: 20000, shippingCents: 7900, totalCents: 97800,
    })
  })
})

describe('estimateDate', () => {
  it('counts from the date in India, not UTC', () => {
    // 01:00 IST on 17 Nov = 19:30 UTC on 16 Nov. +5 days must be 22 Nov.
    assert.equal(estimateDate(5, new Date('2026-11-16T19:30:00Z')), '2026-11-22')
  })

  it('crosses month ends', () => {
    assert.equal(estimateDate(3, new Date('2026-11-29T06:00:00Z')), '2026-12-02')
  })
})
