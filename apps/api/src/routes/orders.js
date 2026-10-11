import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db/pool.js'

export const ordersRouter = Router()

const orderSchema = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  shippingAddress: z.string().min(1),
  items: z
    .array(
      z.object({
        variantId: z.number().int().positive(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
})

ordersRouter.post('/', async (req, res) => {
  const parsed = orderSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid order payload' })
  }

  const { customerName, customerEmail, shippingAddress, items } = parsed.data
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    let totalCents = 0
    const lineItems = []

    for (const item of items) {
      const { rows } = await client.query(
        `SELECT pv.id, pv.stock_quantity, p.base_price_cents
         FROM product_variants pv
         JOIN products p ON p.id = pv.product_id
         WHERE pv.id = $1
         FOR UPDATE`,
        [item.variantId]
      )
      const variant = rows[0]

      if (!variant) {
        throw new Error(`variant ${item.variantId} not found`)
      }
      if (variant.stock_quantity < item.quantity) {
        throw new Error(`insufficient stock for variant ${item.variantId}`)
      }

      totalCents += variant.base_price_cents * item.quantity
      lineItems.push({
        variantId: variant.id,
        quantity: item.quantity,
        unitPriceCents: variant.base_price_cents,
      })
    }

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (customer_name, customer_email, shipping_address, total_cents)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [customerName, customerEmail, shippingAddress, totalCents]
    )
    const orderId = orderRows[0].id

    for (const line of lineItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_variant_id, quantity, unit_price_cents)
         VALUES ($1, $2, $3, $4)`,
        [orderId, line.variantId, line.quantity, line.unitPriceCents]
      )

      await client.query(
        `UPDATE product_variants SET stock_quantity = stock_quantity - $1 WHERE id = $2`,
        [line.quantity, line.variantId]
      )
    }

    await client.query('COMMIT')
    res.status(201).json({ orderId, totalCents })
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(409).json({ error: err.message })
  } finally {
    client.release()
  }
})
