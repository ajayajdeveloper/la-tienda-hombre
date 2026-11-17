import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db/pool.js'
import { conflict, notFound } from '../lib/httpError.js'
import { validate } from '../lib/validate.js'
import { writeLimiter } from '../middleware/rateLimits.js'

export const stockNotificationsRouter = Router()

const body = z.object({
  variantId: z.number().int().positive(),
  email: z.string().trim().toLowerCase().email().max(120),
})

// "Notify me when it's back". Sending the emails is a background job that
// isn't built yet; this records the request, and `notified_at` is where that
// job would mark each one done.
stockNotificationsRouter.post('/', writeLimiter, async (req, res) => {
  const { variantId, email } = validate(body, req.body)

  const { rows: [variant] } = await pool.query(
    'SELECT stock_quantity FROM product_variants WHERE id = $1',
    [variantId]
  )
  if (!variant) throw notFound('variant not found')
  if (variant.stock_quantity > 0) throw conflict('This size is in stock. You can order it now.')

  // ON CONFLICT DO NOTHING: asking twice is not an error, it is already done.
  await pool.query(
    `INSERT INTO stock_notifications (variant_id, email) VALUES ($1, $2)
     ON CONFLICT (variant_id, email) DO NOTHING`,
    [variantId, email]
  )
  res.status(201).json({ ok: true })
})
