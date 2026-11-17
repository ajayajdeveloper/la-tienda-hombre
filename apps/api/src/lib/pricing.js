// Pricing rules live here as pure functions: no database, no Express. The order
// service, the coupon endpoint and the unit tests all call the same code, so
// the price a shopper sees in the cart is computed by the same rules as the
// price they are charged.

export const CURRENCY = 'INR'
export const FREE_SHIPPING_THRESHOLD_CENTS = 99900 // ₹999
export const SHIPPING_FEE_CENTS = 7900 // ₹79
export const MAX_QUANTITY_PER_LINE = 10

/**
 * Is this coupon usable for this subtotal right now? Returns the discount in
 * paise, or the reason it can't be applied (shown to the shopper as-is).
 */
export function evaluateCoupon(coupon, subtotalCents, now = new Date()) {
  if (!coupon || !coupon.is_active) return { ok: false, reason: 'This code is not valid.' }
  if (coupon.starts_at && now < new Date(coupon.starts_at)) {
    return { ok: false, reason: 'This code is not active yet.' }
  }
  if (coupon.expires_at && now > new Date(coupon.expires_at)) {
    return { ok: false, reason: 'This code has expired.' }
  }
  if (coupon.usage_limit !== null && coupon.usage_limit !== undefined && coupon.times_used >= coupon.usage_limit) {
    return { ok: false, reason: 'This code has been fully redeemed.' }
  }
  if (subtotalCents < coupon.min_subtotal_cents) {
    const short = coupon.min_subtotal_cents - subtotalCents
    return {
      ok: false,
      reason: `Add ${formatRupees(short)} more to use this code.`,
      shortByCents: short,
    }
  }

  let discount =
    coupon.discount_type === 'percent'
      ? Math.floor((subtotalCents * coupon.discount_value) / 100) // round DOWN: never over-discount
      : coupon.discount_value

  if (coupon.max_discount_cents) discount = Math.min(discount, coupon.max_discount_cents)
  discount = Math.min(discount, subtotalCents) // a discount can't make the order negative

  return { ok: true, discountCents: discount }
}

/** Shipping is judged on what the shopper actually pays for goods (after discount). */
export function shippingFor(subtotalAfterDiscountCents) {
  return subtotalAfterDiscountCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_FEE_CENTS
}

export function computeTotals({ subtotalCents, discountCents = 0 }) {
  const afterDiscount = subtotalCents - discountCents
  const shippingCents = shippingFor(afterDiscount)
  return {
    subtotalCents,
    discountCents,
    shippingCents,
    totalCents: afterDiscount + shippingCents,
  }
}

export function formatRupees(cents) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: CURRENCY,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100)
}
