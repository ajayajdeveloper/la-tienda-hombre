import './setup.js'
import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import {
  api, customer, orderBody, pool, resetDatabase, setStock, stockOf, variantWithStock,
} from './helpers.js'

before(resetDatabase)
after(() => pool.end())

describe('POST /api/orders', () => {
  let variant
  beforeEach(async () => {
    variant = await variantWithStock(5)
    await setStock(variant.id, 10)
  })

  it('creates an order, decrements stock and returns a public id', async () => {
    const { body } = await api().post('/api/orders').send(orderBody([{ variantId: variant.id, quantity: 2 }])).expect(201)

    assert.match(body.public_id, /^[0-9a-f-]{36}$/)
    assert.equal(body.id, undefined, 'the sequential id must not be exposed')
    assert.equal(body.subtotal_cents, variant.base_price_cents * 2)
    assert.equal(body.total_cents, body.subtotal_cents - body.discount_cents + body.shipping_cents)
    assert.equal(await stockOf(variant.id), 8)
  })

  it('ignores any price sent by the client', async () => {
    const { body } = await api()
      .post('/api/orders')
      .send(orderBody([{ variantId: variant.id, quantity: 1, priceCents: 1 }]))
      .expect(201)
    assert.equal(body.subtotal_cents, variant.base_price_cents)
  })

  it('merges duplicate lines before checking stock', async () => {
    await setStock(variant.id, 1)
    const { body } = await api()
      .post('/api/orders')
      .send(orderBody([{ variantId: variant.id, quantity: 1 }, { variantId: variant.id, quantity: 1 }]))
      .expect(409)
    assert.equal(body.details.shortfalls[0].requested, 2)
    assert.equal(await stockOf(variant.id), 1)
  })

  it('reports every shortfall and changes nothing', async () => {
    const other = await pool.query('SELECT id FROM product_variants WHERE id <> $1 ORDER BY id LIMIT 1', [variant.id])
    await setStock(variant.id, 1)
    await setStock(other.rows[0].id, 0)
    const { body } = await api()
      .post('/api/orders')
      .send(orderBody([{ variantId: variant.id, quantity: 3 }, { variantId: other.rows[0].id, quantity: 1 }]))
      .expect(409)
    assert.equal(body.details.shortfalls.length, 2)
    assert.equal(await stockOf(variant.id), 1, 'rolled back')
  })

  it('applies a coupon inside the transaction and counts its use', async () => {
    await setStock(variant.id, 10)
    const before = await pool.query("SELECT times_used FROM coupons WHERE code = 'WELCOME10'")
    const { body } = await api()
      .post('/api/orders')
      .send(orderBody([{ variantId: variant.id, quantity: 5 }], { couponCode: 'welcome10' }))
      .expect(201)
    assert.ok(body.discount_cents > 0)
    assert.equal(body.coupon_code, 'WELCOME10')
    const after = await pool.query("SELECT times_used FROM coupons WHERE code = 'WELCOME10'")
    assert.equal(after.rows[0].times_used, before.rows[0].times_used + 1)
  })

  it('rejects an expired coupon without touching stock', async () => {
    await api()
      .post('/api/orders')
      .send(orderBody([{ variantId: variant.id, quantity: 1 }], { couponCode: 'SUMMER25' }))
      .expect(400)
    assert.equal(await stockOf(variant.id), 10)
  })

  it('refuses cash on delivery where it is not available', async () => {
    const { body } = await api()
      .post('/api/orders')
      .send({ customer: { ...customer, pincode: '791001' }, items: [{ variantId: variant.id, quantity: 1 }] })
      .expect(400)
    assert.match(body.error, /Cash on delivery/)
  })

  it('validates the customer details', async () => {
    const { body } = await api()
      .post('/api/orders')
      .send({ customer: { ...customer, phone: '12345' }, items: [{ variantId: variant.id, quantity: 1 }] })
      .expect(400)
    assert.equal(body.details[0].path, 'customer.phone')
  })
})

describe('POST /api/orders/quote', () => {
  it('prices from the database, flags shortfalls and explains a coupon that does not apply', async () => {
    const variant = await variantWithStock(5)
    await setStock(variant.id, 0)
    const { body } = await api()
      .post('/api/orders/quote')
      .send({ items: [{ variantId: variant.id, quantity: 1 }, { variantId: 999999, quantity: 1 }], couponCode: 'big500' })
      .expect(200)

    assert.equal(body.lines[0].priceCents, variant.base_price_cents)
    assert.deepEqual(body.shortfalls, [variant.id])
    assert.deepEqual(body.unavailable, [999999])
    assert.equal(body.coupon.ok, false)
    assert.match(body.coupon.reason, /more to use this code/)
    assert.equal(await stockOf(variant.id), 0, 'a quote never changes stock')
  })
})

describe('concurrency', () => {
  it('sells the last item exactly once when two orders race', async () => {
    const variant = await variantWithStock(1)
    await setStock(variant.id, 1)

    const results = await Promise.all(
      [1, 2].map(() => api().post('/api/orders').send(orderBody([{ variantId: variant.id, quantity: 1 }])))
    )
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 409])
    assert.equal(await stockOf(variant.id), 0)
  })

  it('does not deadlock when orders lock the same rows in opposite order', async () => {
    const { rows } = await pool.query('SELECT id FROM product_variants ORDER BY id LIMIT 2')
    const [a, b] = rows.map((r) => r.id)
    await setStock(a, 100)
    await setStock(b, 100)

    // 10 pairs of opposite-order orders, all at once. Without ORDER BY id in
    // the locking query, Postgres would detect deadlocks and abort some (500s).
    const requests = []
    for (let i = 0; i < 10; i++) {
      requests.push(api().post('/api/orders').send(orderBody([{ variantId: a, quantity: 1 }, { variantId: b, quantity: 1 }])))
      requests.push(api().post('/api/orders').send(orderBody([{ variantId: b, quantity: 1 }, { variantId: a, quantity: 1 }])))
    }
    const results = await Promise.all(requests)
    assert.ok(results.every((r) => r.status === 201), `statuses: ${results.map((r) => r.status)}`)
    assert.equal(await stockOf(a), 80)
    assert.equal(await stockOf(b), 80)
  })
})

describe('idempotency', () => {
  it('returns the original order when the same key is retried', async () => {
    const variant = await variantWithStock(5)
    await setStock(variant.id, 10)
    const key = randomUUID()
    const body = orderBody([{ variantId: variant.id, quantity: 1 }])

    const first = await api().post('/api/orders').set('Idempotency-Key', key).send(body).expect(201)
    const retry = await api().post('/api/orders').set('Idempotency-Key', key).send(body).expect(200)

    assert.equal(retry.body.public_id, first.body.public_id)
    assert.equal(await stockOf(variant.id), 9, 'charged once')
  })

  it('creates one order when the same key arrives twice at once', async () => {
    const variant = await variantWithStock(5)
    await setStock(variant.id, 10)
    const key = randomUUID()
    const body = orderBody([{ variantId: variant.id, quantity: 1 }])

    const results = await Promise.all(
      [1, 2].map(() => api().post('/api/orders').set('Idempotency-Key', key).send(body))
    )
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 201])
    assert.equal(results[0].body.public_id, results[1].body.public_id)
    assert.equal(await stockOf(variant.id), 9)
  })
})

describe('review fixes', () => {
  it('replays the order (not a 409) when retries race the original for the LAST unit', async () => {
    // Timing-dependent race, so make it likely: 8 copies at once, 5 rounds.
    // Without the key lock, a copy that waits on the stock row lock sees stock 0 and gets a 409.
    const variant = await variantWithStock(1)
    for (let round = 0; round < 5; round++) {
      await setStock(variant.id, 1)
      const key = randomUUID()
      const body = orderBody([{ variantId: variant.id, quantity: 1 }])
      const results = await Promise.all(
        Array.from({ length: 8 }, () => api().post('/api/orders').set('Idempotency-Key', key).send(body))
      )
      const statuses = results.map((r) => r.status)
      assert.ok(statuses.every((s) => s === 200 || s === 201), `round ${round}: ${statuses}`)
      assert.equal(statuses.filter((s) => s === 201).length, 1)
      assert.equal(new Set(results.map((r) => r.body.public_id)).size, 1)
      assert.equal(await stockOf(variant.id), 0)
    }
  })

  it('refuses to charge a total the shopper was not shown', async () => {
    const variant = await variantWithStock(5)
    await setStock(variant.id, 10)
    const { body } = await api()
      .post('/api/orders')
      .send(orderBody([{ variantId: variant.id, quantity: 1 }], { expectedTotalCents: 1 }))
      .expect(409)
    assert.equal(body.details.priceChanged, true)
    assert.equal(await stockOf(variant.id), 10)
  })

  it('accepts the order when the shown total matches the quote', async () => {
    const variant = await variantWithStock(5)
    const items = [{ variantId: variant.id, quantity: 1 }]
    const { body: quote } = await api().post('/api/orders/quote').send({ items }).expect(200)
    await api().post('/api/orders').send(orderBody(items, { expectedTotalCents: quote.totalCents })).expect(201)
  })

  it('ignores out-of-range ids instead of failing with a 500', async () => {
    const { body } = await api().get('/api/products?ids=99999999999').expect(200)
    assert.equal(body.total > 0, true) // the bad id is dropped, so no ids filter applies
  })
})

describe('GET /api/orders/:publicId', () => {
  it('returns the order with snapshot line items', async () => {
    const variant = await variantWithStock(5)
    const { body: created } = await api().post('/api/orders').send(orderBody([{ variantId: variant.id, quantity: 1 }])).expect(201)

    // Renaming the product later must not change what the order shows.
    await pool.query("UPDATE products SET name = 'Renamed' WHERE id = $1", [variant.product_id])
    const { body } = await api().get(`/api/orders/${created.public_id}`).expect(200)
    assert.notEqual(body.items[0].product_name, 'Renamed')
    assert.ok(body.estimated_delivery_date)
  })

  it('404s for an unknown id and 400s for a malformed one', async () => {
    await api().get(`/api/orders/${randomUUID()}`).expect(404)
    await api().get('/api/orders/42').expect(400)
  })
})
