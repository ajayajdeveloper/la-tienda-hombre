import { pool } from '../db/pool.js'

export const PINCODE_PATTERN = /^[1-9][0-9]{5}$/

// Longest-prefix match: for 560034, the '560' (Bengaluru) row beats '5'
// (South India) because it is longer. Same idea as IP routing tables.
export async function findDeliveryZone(pincode) {
  if (!PINCODE_PATTERN.test(pincode)) return null
  const { rows } = await pool.query(
    `SELECT prefix, region, delivery_days, cod_available
     FROM delivery_zones
     WHERE $1 LIKE prefix || '%'
     ORDER BY length(prefix) DESC
     LIMIT 1`,
    [pincode]
  )
  return rows[0] ?? null
}

// Business dates are Indian dates. "Today" is today in IST, whatever time zone
// the server runs in (cloud servers are usually UTC, which is 5.5h behind:
// an order at 01:00 IST would otherwise count from the previous day).
const IST_DATE = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }) // en-CA formats as YYYY-MM-DD

export function estimateDate(days, from = new Date()) {
  const [y, m, d] = IST_DATE.format(from).split('-').map(Number)
  // Date.UTC + toISOString: pure calendar arithmetic, no time zone involved.
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}
