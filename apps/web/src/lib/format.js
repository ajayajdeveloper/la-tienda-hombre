// Money is integer paise everywhere; only formatting turns it into rupees.
// Intl.NumberFormat with en-IN gives Indian digit grouping: ₹1,29,900.
const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export function formatPrice(cents) {
  if (cents == null) return ''
  return rupees.format(Math.round(cents / 100))
}

/** Percentage off MRP, rounded down so we never overstate a discount. */
export function discountPercent(priceCents, compareAtCents) {
  if (!compareAtCents || compareAtCents <= priceCents) return 0
  return Math.floor(((compareAtCents - priceCents) / compareAtCents) * 100)
}

const dateFormat = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
const longDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

/** "2026-11-19" -> "Thu, 19 Nov". Parsed as local noon so time zones can't shift the day. */
export function formatDeliveryDate(isoDate) {
  return dateFormat.format(new Date(`${isoDate}T12:00:00`))
}

export function formatLongDate(value) {
  return longDate.format(new Date(value))
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}
