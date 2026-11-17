import './setup.js'
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { api, pool, resetDatabase } from './helpers.js'

before(resetDatabase)
after(() => pool.end())

describe('GET /api/products', () => {
  it('includes products from subcategories when filtering by a parent category', async () => {
    const { body } = await api().get('/api/products?category=shirts&limit=48').expect(200)
    const categories = new Set(body.items.map((p) => p.category_slug))
    assert.ok(categories.has('linen-shirts'))
    assert.ok(categories.has('check-shirts'))
    assert.equal(body.total, body.items.length)
  })

  it('matches size AND colour on the same in-stock variant', async () => {
    const { body } = await api().get('/api/products?sizes=M&colors=Navy&limit=48').expect(200)
    assert.ok(body.total > 0)
    for (const product of body.items) {
      const { rows } = await pool.query(
        `SELECT 1 FROM product_variants
         WHERE product_id = $1 AND size = 'M' AND color = 'Navy' AND stock_quantity > 0`,
        [product.id]
      )
      assert.equal(rows.length, 1, `${product.name} has no in-stock Navy M`)
    }
  })

  it('counts each facet without its own filter applied', async () => {
    const { body } = await api().get('/api/products?category=t-shirts&sizes=M').expect(200)
    // Selecting M must not zero out the other sizes in the size facet.
    assert.ok(body.facets.sizes.length > 1)
    assert.ok(body.facets.sizes.some((s) => s.value === 'L' && s.count > 0))
  })

  it('sorts by price and paginates without overlap', async () => {
    const page1 = await api().get('/api/products?sort=price_asc&limit=10&page=1').expect(200)
    const page2 = await api().get('/api/products?sort=price_asc&limit=10&page=2').expect(200)
    const prices = [...page1.body.items, ...page2.body.items].map((p) => p.price_cents)
    assert.deepEqual(prices, [...prices].sort((a, b) => a - b))
    const ids1 = new Set(page1.body.items.map((p) => p.id))
    assert.ok(page2.body.items.every((p) => !ids1.has(p.id)))
  })

  it('searches by word prefix and ranks by relevance', async () => {
    const { body } = await api().get('/api/products?q=lin').expect(200)
    assert.equal(body.sort, 'relevance')
    assert.ok(body.items.length > 0)
    assert.ok(body.items.every((p) => /linen/i.test(p.name)))
  })

  it('treats SQL in the search box as plain text', async () => {
    const { body } = await api()
      .get(`/api/products?q=${encodeURIComponent("shirt'; DROP TABLE products; --")}`)
      .expect(200)
    assert.ok(Array.isArray(body.items))
    const { rows } = await pool.query('SELECT count(*) AS n FROM products')
    assert.ok(rows[0].n > 0)
  })

  it('rejects an unknown sort with 400', async () => {
    const { body } = await api().get('/api/products?sort=hacker').expect(400)
    assert.equal(body.details[0].path, 'sort')
  })
})

describe('GET /api/products/:slug', () => {
  it('returns images, variants and breadcrumbs', async () => {
    const { body } = await api().get('/api/products/pure-linen-shirt').expect(200)
    assert.equal(body.parent_category.slug, 'shirts')
    assert.ok(body.images.length >= 2)
    assert.ok(body.variants.length >= 5)
  })

  it('404s for an unknown slug', async () => {
    await api().get('/api/products/does-not-exist').expect(404)
  })
})

describe('reviews', () => {
  it('updates the rating counters in the same transaction', async () => {
    const before = await api().get('/api/products/pique-polo').expect(200)
    await api()
      .post('/api/products/pique-polo/reviews')
      .send({ rating: 5, title: 'Great', body: 'Love it', authorName: 'Tester' })
      .expect(201)
    const after = await api().get('/api/products/pique-polo').expect(200)
    assert.equal(after.body.rating_count, before.body.rating_count + 1)
  })
})

describe('delivery and coupons', () => {
  it('uses the longest matching pincode prefix', async () => {
    const metro = await api().get('/api/delivery/560034').expect(200)
    const region = await api().get('/api/delivery/570001').expect(200)
    assert.equal(metro.body.region, 'Bengaluru')
    assert.equal(region.body.region, 'South India')
  })

  it('lists only coupons that are currently usable', async () => {
    const { body } = await api().get('/api/coupons').expect(200)
    const codes = body.map((c) => c.code)
    assert.ok(codes.includes('FLAT200'))
    assert.ok(!codes.includes('SUMMER25'), 'expired coupon must be hidden')
  })
})
