import { pool, withTransaction } from '../db/pool.js'
import { badRequest, conflict, notFound } from '../lib/httpError.js'
import { computeTotals, evaluateCoupon } from '../lib/pricing.js'
import { estimateDate, findDeliveryZone } from './delivery.js'

const UNIQUE_VIOLATION = '23505'

function mergeQuantities(items) {
  const quantities = new Map()
  for (const { variantId, quantity } of items) {
    quantities.set(variantId, (quantities.get(variantId) ?? 0) + quantity)
  }
  return quantities
}

/**
 * Price a cart WITHOUT placing an order: current prices, current stock, and
 * the coupon result. The cart and checkout pages show this, so the totals a
 * shopper sees come from the same rules (lib/pricing.js) as the final charge.
 * Problems (sold out, bad coupon) are returned as data, not thrown, because
 * the page needs to display them next to the affected line.
 */
export async function quoteOrder({ items, couponCode }) {
  const quantities = mergeQuantities(items)
  const { rows: variants } = await pool.query(
    `SELECT v.id, v.size, v.color, v.stock_quantity, p.slug, p.is_active,
            p.name AS product_name, p.base_price_cents, p.compare_at_price_cents,
            (SELECT url FROM product_images pi WHERE pi.product_id = p.id AND pi.color = v.color
             ORDER BY sort_order LIMIT 1) AS image
     FROM product_variants v JOIN products p ON p.id = v.product_id
     WHERE v.id = ANY($1::int[])`,
    [[...quantities.keys()]]
  )
  const byId = new Map(variants.filter((v) => v.is_active).map((v) => [v.id, v]))

  const lines = []
  const unavailable = []
  for (const [variantId, quantity] of quantities) {
    const v = byId.get(variantId)
    if (!v) {
      unavailable.push(variantId)
      continue
    }
    lines.push({
      variantId,
      quantity,
      available: v.stock_quantity,
      name: v.product_name,
      slug: v.slug,
      size: v.size,
      color: v.color,
      image: v.image,
      priceCents: v.base_price_cents,
      compareAtPriceCents: v.compare_at_price_cents,
      lineTotalCents: v.base_price_cents * quantity,
    })
  }

  const shortfalls = lines.filter((l) => l.available < l.quantity).map((l) => l.variantId)
  const subtotalCents = lines.reduce((sum, l) => sum + l.lineTotalCents, 0)

  let coupon = null
  let discountCents = 0
  if (couponCode) {
    const code = couponCode.trim().toUpperCase()
    const { rows: [row] } = await pool.query('SELECT * FROM coupons WHERE code = $1', [code])
    const result = evaluateCoupon(row, subtotalCents)
    coupon = result.ok
      ? { code, ok: true, description: row.description, discountCents: result.discountCents }
      : { code, ok: false, reason: result.reason }
    if (result.ok) discountCents = result.discountCents
  }

  return { lines, unavailable, shortfalls, coupon, ...computeTotals({ subtotalCents, discountCents }) }
}

/**
 * Place an order. Everything below runs in ONE transaction: stock, coupon
 * usage, and the order rows all commit together or not at all.
 */
export async function placeOrder(input, { idempotencyKey } = {}) {
  if (idempotencyKey) {
    const existing = await findOrderIdByKey(idempotencyKey)
    if (existing) return { order: await getOrder(existing), replayed: true }
  }

  // 1. Merge duplicate lines. Two lines for the same variant (qty 1 + qty 1)
  //    must be checked against stock as qty 2. v1 checked each line separately,
  //    so both lines passed a stock-of-1 check.
  const quantities = mergeQuantities(input.items)
  const variantIds = [...quantities.keys()]

  const zone = await findDeliveryZone(input.customer.pincode)
  if (!zone) throw badRequest('We do not deliver to this pincode yet.')
  if (input.paymentMethod === 'cod' && !zone.cod_available) {
    throw badRequest('Cash on delivery is not available for this pincode.')
  }

  try {
    const outcome = await withTransaction(async (db) => {
      // 1b. Same idempotency key = take turns. A retry that arrives while the
      //     original is still running waits here (not on the stock rows, where
      //     it would see stock the original just used and wrongly fail with
      //     409). Once the original commits, the retry finds its order below.
      //     The lock is released automatically at COMMIT/ROLLBACK.
      if (idempotencyKey) {
        await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [idempotencyKey])
        const { rows: [done] } = await db.query('SELECT id FROM orders WHERE idempotency_key = $1', [idempotencyKey])
        if (done) return { existingId: done.id }
      }

      // 2. Lock the variant rows. ORDER BY id is what prevents DEADLOCKS: if
      //    order A locks variants (5, 9) and order B locks (9, 5), each can end
      //    up holding one lock and waiting forever for the other. When every
      //    transaction locks in ascending id order, that cycle can't form.
      //    `FOR UPDATE OF v` locks only variant rows, not the joined product rows.
      const { rows: variants } = await db.query(
        `SELECT v.id, v.size, v.color, v.stock_quantity, v.product_id,
                p.name AS product_name, p.base_price_cents, p.is_active
         FROM product_variants v
         JOIN products p ON p.id = v.product_id
         WHERE v.id = ANY($1::int[])
         ORDER BY v.id
         FOR UPDATE OF v`,
        [variantIds]
      )

      if (variants.length !== variantIds.length || variants.some((v) => !v.is_active)) {
        const found = new Set(variants.filter((v) => v.is_active).map((v) => v.id))
        throw conflict('Some items are no longer available.', {
          unavailable: variantIds.filter((id) => !found.has(id)),
        })
      }

      // 3. Check stock for every line and report ALL shortfalls at once, so the
      //    cart can fix every line in one go instead of one error at a time.
      const shortfalls = variants
        .filter((v) => v.stock_quantity < quantities.get(v.id))
        .map((v) => ({
          variantId: v.id,
          name: v.product_name,
          size: v.size,
          color: v.color,
          requested: quantities.get(v.id),
          available: v.stock_quantity,
        }))
      if (shortfalls.length) throw conflict('Not enough stock for some items.', { shortfalls })

      // 4. Prices come from the database, never from the request body.
      const subtotalCents = variants.reduce((sum, v) => sum + v.base_price_cents * quantities.get(v.id), 0)

      // 5. Coupon, locked too: with a usage limit, two shoppers redeeming the
      //    last use at the same moment must not both succeed.
      let discountCents = 0
      let couponCode = null
      if (input.couponCode) {
        const code = input.couponCode.trim().toUpperCase()
        const { rows: [coupon] } = await db.query('SELECT * FROM coupons WHERE code = $1 FOR UPDATE', [code])
        const result = evaluateCoupon(coupon, subtotalCents)
        if (!result.ok) throw badRequest(result.reason, { field: 'couponCode' })
        discountCents = result.discountCents
        couponCode = code
        await db.query('UPDATE coupons SET times_used = times_used + 1 WHERE code = $1', [code])
      }

      const totals = computeTotals({ subtotalCents, discountCents })

      // 6. Price guard: the browser sends the total it showed the shopper. If
      //    a price changed since that quote, stop instead of silently charging
      //    a different amount; the page refetches the quote and shows the new total.
      if (input.expectedTotalCents != null && input.expectedTotalCents !== totals.totalCents) {
        throw conflict('Prices have changed since you loaded this page. Please review the updated total.', {
          priceChanged: true,
          expectedTotalCents: input.expectedTotalCents,
          totalCents: totals.totalCents,
        })
      }

      const { customer } = input

      const { rows: [order] } = await db.query(
        `INSERT INTO orders
           (status, customer_name, customer_email, customer_phone, shipping_address, pincode,
            payment_method, coupon_code, subtotal_cents, discount_cents, shipping_cents, total_cents,
            estimated_delivery_days, idempotency_key)
         VALUES ('confirmed', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id`,
        [
          customer.name, customer.email, customer.phone,
          `${customer.address}, ${customer.city}, ${customer.state}`, customer.pincode,
          input.paymentMethod, couponCode, totals.subtotalCents, totals.discountCents,
          totals.shippingCents, totals.totalCents, zone.delivery_days, idempotencyKey ?? null,
        ]
      )

      // 7. Bulk writes with unnest(): one round trip for all lines instead of
      //    one INSERT/UPDATE per line. Arrays are passed as parameters, so this
      //    is just as injection-safe as single-row queries.
      const ids = variants.map((v) => v.id)
      const qtys = variants.map((v) => quantities.get(v.id))
      await db.query(
        `INSERT INTO order_items (order_id, product_variant_id, quantity, unit_price_cents, product_name, size, color)
         SELECT $1, x.variant_id, x.qty, x.price, x.name, x.size, x.color
         FROM unnest($2::int[], $3::int[], $4::int[], $5::text[], $6::text[], $7::text[])
              AS x(variant_id, qty, price, name, size, color)`,
        [
          order.id, ids, qtys,
          variants.map((v) => v.base_price_cents),
          variants.map((v) => v.product_name),
          variants.map((v) => v.size),
          variants.map((v) => v.color),
        ]
      )

      await db.query(
        `UPDATE product_variants v SET stock_quantity = v.stock_quantity - x.qty
         FROM unnest($1::int[], $2::int[]) AS x(id, qty)
         WHERE v.id = x.id`,
        [ids, qtys]
      )

      await db.query(
        `UPDATE products p SET sold_count = p.sold_count + x.qty
         FROM (SELECT v.product_id, sum(x.qty) AS qty
               FROM unnest($1::int[], $2::int[]) AS x(id, qty)
               JOIN product_variants v ON v.id = x.id
               GROUP BY v.product_id) x
         WHERE p.id = x.product_id`,
        [ids, qtys]
      )

      return { orderId: order.id }
    })

    if (outcome.existingId) return { order: await getOrder(outcome.existingId), replayed: true }
    return { order: await getOrder(outcome.orderId), replayed: false }
  } catch (err) {
    // Two requests with the same idempotency key raced: both passed the
    // lookup above, one committed, this one hit the UNIQUE constraint.
    // Its transaction was rolled back, so return the order that won.
    if (err.code === UNIQUE_VIOLATION && idempotencyKey) {
      const existing = await findOrderIdByKey(idempotencyKey)
      if (existing) return { order: await getOrder(existing), replayed: true }
    }
    throw err
  }
}

async function findOrderIdByKey(key) {
  const { rows } = await pool.query('SELECT id FROM orders WHERE idempotency_key = $1', [key])
  return rows[0]?.id
}

/** Look up by internal id or by public UUID. Only the UUID is ever exposed. */
export async function getOrder(idOrPublicId) {
  const byPublic = typeof idOrPublicId === 'string'
  const { rows: [order] } = await pool.query(
    `SELECT o.id, o.public_id, o.status, o.customer_name, o.customer_email, o.customer_phone,
            o.shipping_address, o.pincode, o.payment_method, o.coupon_code,
            o.subtotal_cents, o.discount_cents, o.shipping_cents, o.total_cents,
            o.estimated_delivery_days, o.created_at
     FROM orders o WHERE ${byPublic ? 'o.public_id = $1' : 'o.id = $1'}`,
    [idOrPublicId]
  )
  if (!order) throw notFound('order not found')

  const { rows: items } = await pool.query(
    `SELECT oi.product_variant_id AS variant_id, oi.product_name, oi.size, oi.color,
            oi.quantity, oi.unit_price_cents, p.slug,
            (SELECT url FROM product_images pi
             WHERE pi.product_id = p.id AND pi.color = oi.color
             ORDER BY sort_order LIMIT 1) AS image
     FROM order_items oi
     LEFT JOIN product_variants v ON v.id = oi.product_variant_id
     LEFT JOIN products p ON p.id = v.product_id
     WHERE oi.order_id = $1
     ORDER BY oi.id`,
    [order.id]
  )

  const { id, ...publicFields } = order // never leak the sequential id
  const estimated = estimateDate(order.estimated_delivery_days ?? 5, new Date(order.created_at))
  return { ...publicFields, estimated_delivery_date: estimated, items }
}
