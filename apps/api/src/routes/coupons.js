import { Router } from 'express'
import { pool } from '../db/pool.js'
import { cacheFor } from '../middleware/cache.js'

export const couponsRouter = Router()

// Public offers shown as cards on the product page and cart. Whether a code
// applies to a given cart is answered by POST /api/orders/quote.
couponsRouter.get('/', cacheFor(300), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT code, description, discount_type, discount_value, max_discount_cents, min_subtotal_cents
     FROM coupons
     WHERE is_active
       AND (starts_at IS NULL OR starts_at <= now())
       AND (expires_at IS NULL OR expires_at > now())
       AND (usage_limit IS NULL OR times_used < usage_limit)
     ORDER BY min_subtotal_cents`
  )
  res.json(rows)
})
