import { useSelector } from 'react-redux'
import { useQuoteQuery } from '../store/apiSlice.js'
import { selectCouponCode, selectOrderLines } from '../store/cartSelectors.js'

/**
 * Server-priced view of the current cart. Re-runs whenever the cart lines or
 * coupon change (RTK Query compares the arguments by value).
 * Returns totals in the shape OrderSummary expects, plus per-line problems.
 */
export function useCartQuote() {
  const items = useSelector(selectOrderLines)
  const couponCode = useSelector(selectCouponCode)
  const query = useQuoteQuery({ items, couponCode: couponCode ?? undefined }, { skip: items.length === 0 })
  const quote = query.data

  const problems = new Map()
  if (quote) {
    for (const id of quote.unavailable) problems.set(id, 'No longer available')
    for (const line of quote.lines) {
      if (line.available === 0) problems.set(line.variantId, 'Sold out')
      else if (line.available < line.quantity) problems.set(line.variantId, `Only ${line.available} left`)
    }
  }

  // A code that no longer qualifies (e.g. quantities dropped below its minimum)
  // blocks checkout until it's removed: the server would reject the order.
  const couponProblem = quote?.coupon && !quote.coupon.ok ? quote.coupon : null
  const linePrice = new Map((quote?.lines ?? []).map((l) => [l.variantId, l.priceCents]))

  return {
    ...query,
    quote,
    totals: quote && { ...quote, couponCode: quote.coupon?.ok ? quote.coupon.code : null },
    problems,
    hasProblems: problems.size > 0,
    couponProblem,
    // Server price for a line, falling back to the snapshot until the quote arrives.
    priceOf: (item) => linePrice.get(item.variantId) ?? item.priceCents,
  }
}
