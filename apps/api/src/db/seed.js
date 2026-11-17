import { pathToFileURL } from 'node:url'
import { pool, withTransaction } from './pool.js'
import {
  CATEGORIES, COLLECTIONS, COLORS, COUPONS, DELIVERY_ZONES, PRODUCTS,
  REVIEW_AUTHORS, REVIEW_TEMPLATES, imageUrl, sizesFor, slugify,
} from './seed-data.js'

// Seeded pseudo-random generator (mulberry32). Same seed -> same "random"
// stock and reviews on every run, so tests and screenshots are reproducible.
function createRandom(seed) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SKU_PREFIX = {
  shirt: 'SH', 'shirt-half': 'SS', overshirt: 'OS', tee: 'TE', 'tee-oversized': 'TO', polo: 'PO',
  trousers: 'TR', jeans: 'JN', 'jeans-baggy': 'JB', joggers: 'JG', shorts: 'SR',
  hoodie: 'HD', sweatshirt: 'SW', sweater: 'KN', jacket: 'JK',
}

export async function seed({ log = console.log, force = false } = {}) {
  const { rows } = await pool.query('SELECT count(*) AS n FROM orders')
  if (rows[0].n > 0 && !force) {
    throw new Error(
      `refusing to seed: the orders table has ${rows[0].n} rows and seeding wipes them. ` +
        'Re-run with --force if you really mean it.'
    )
  }

  const random = createRandom(42)
  const pick = (list) => list[Math.floor(random() * list.length)]

  await withTransaction(async (db) => {
    await db.query(`
      TRUNCATE stock_notifications, reviews, order_items, orders, coupons, delivery_zones,
               product_collections, collections, product_images, product_variants, products, categories
      RESTART IDENTITY CASCADE`)

    // Categories: parents first, so children can reference parent ids.
    const categoryIdBySlug = {}
    for (const [i, parent] of CATEGORIES.entries()) {
      const { rows: [p] } = await db.query(
        'INSERT INTO categories (name, slug, sort_order) VALUES ($1, $2, $3) RETURNING id',
        [parent.name, parent.slug, i]
      )
      categoryIdBySlug[parent.slug] = p.id
      for (const [j, child] of parent.children.entries()) {
        const { rows: [c] } = await db.query(
          'INSERT INTO categories (name, slug, parent_id, sort_order) VALUES ($1, $2, $3, $4) RETURNING id',
          [child.name, child.slug, p.id, j]
        )
        categoryIdBySlug[child.slug] = c.id
      }
    }

    const collectionIdBySlug = {}
    for (const [i, c] of COLLECTIONS.entries()) {
      const { rows: [row] } = await db.query(
        'INSERT INTO collections (name, slug, tagline, sort_order) VALUES ($1, $2, $3, $4) RETURNING id',
        [c.name, c.slug, c.tagline, i]
      )
      collectionIdBySlug[c.slug] = row.id
    }

    const firstImageByCategory = {}
    const firstImageByCollection = {}

    for (const product of PRODUCTS) {
      const slug = slugify(product.name)
      const createdAt = new Date(Date.now() - product.ageDays * 86_400_000)

      // Rating: 0-14 reviews, skewed towards 4 and 5 stars.
      const reviewCount = Math.floor(random() * 15)
      const reviews = Array.from({ length: reviewCount }, () => {
        const r = random()
        const rating = r < 0.55 ? 5 : r < 0.85 ? 4 : r < 0.95 ? 3 : 2
        const [title, body] = pick(REVIEW_TEMPLATES[rating])
        return {
          rating, title, body, author: pick(REVIEW_AUTHORS),
          createdAt: new Date(createdAt.getTime() + random() * product.ageDays * 86_400_000),
        }
      })
      const ratingSum = reviews.reduce((sum, r) => sum + r.rating, 0)

      const { rows: [p] } = await db.query(
        `INSERT INTO products
           (category_id, name, slug, description, base_price_cents, compare_at_price_cents, badge,
            fit, fabric, highlights, care, sold_count, rating_sum, rating_count, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
        [
          categoryIdBySlug[product.sub], product.name, slug, product.description, product.price,
          product.mrp ?? null, product.badge ?? null, product.fit, product.fabric,
          JSON.stringify(product.highlights),
          'Machine wash cold, inside out. Do not bleach. Tumble dry low. Warm iron if needed.',
          product.sold, ratingSum, reviews.length, createdAt,
        ]
      )

      for (const review of reviews) {
        await db.query(
          `INSERT INTO reviews (product_id, rating, title, body, author_name, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [p.id, review.rating, review.title, review.body, review.author, review.createdAt]
        )
      }

      const sizes = sizesFor(product.kind)
      let imageOrder = 0
      for (const colorKey of product.colors) {
        const color = COLORS[colorKey]
        for (const view of ['front', 'detail']) {
          const url = imageUrl(product.kind, product.pattern, colorKey, view)
          await db.query(
            'INSERT INTO product_images (product_id, color, url, alt, sort_order) VALUES ($1, $2, $3, $4, $5)',
            [p.id, color.name, url, `${product.name} in ${color.name}, ${view} view`, imageOrder++]
          )
          if (view === 'front') {
            const parentSlug = CATEGORIES.find((c) => c.children.some((ch) => ch.slug === product.sub)).slug
            firstImageByCategory[product.sub] ??= url
            firstImageByCategory[parentSlug] ??= url
            for (const c of product.collections) firstImageByCollection[c] ??= url
          }
        }

        for (const [sizeIndex, size] of sizes.entries()) {
          // ~12% sold out, ~13% low stock (1-4 left), the rest 8-40.
          const r = random()
          const stock = r < 0.12 ? 0 : r < 0.25 ? 1 + Math.floor(random() * 4) : 8 + Math.floor(random() * 33)
          const sku = `${SKU_PREFIX[product.kind]}-${slug.slice(0, 12).toUpperCase()}-${colorKey.toUpperCase()}-${size}`
          await db.query(
            `INSERT INTO product_variants (product_id, size, color, color_hex, size_order, sku, stock_quantity)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [p.id, size, color.name, color.hex, sizeIndex + 1, sku, stock]
          )
        }
      }

      for (const c of product.collections) {
        await db.query(
          'INSERT INTO product_collections (collection_id, product_id) VALUES ($1, $2)',
          [collectionIdBySlug[c], p.id]
        )
      }
    }

    for (const [slug, url] of Object.entries(firstImageByCategory)) {
      await db.query('UPDATE categories SET image_url = $1 WHERE slug = $2', [url, slug])
    }
    for (const [slug, url] of Object.entries(firstImageByCollection)) {
      await db.query('UPDATE collections SET image_url = $1 WHERE slug = $2', [url, slug])
    }

    for (const c of COUPONS) {
      await db.query(
        `INSERT INTO coupons (code, description, discount_type, discount_value, max_discount_cents,
                              min_subtotal_cents, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [c.code, c.description, c.discount_type, c.discount_value, c.max_discount_cents ?? null,
          c.min_subtotal_cents, c.expires_at ?? null]
      )
    }

    for (const z of DELIVERY_ZONES) {
      await db.query(
        'INSERT INTO delivery_zones (prefix, region, delivery_days, cod_available) VALUES ($1, $2, $3, $4)',
        [z.prefix, z.region, z.delivery_days, z.cod_available]
      )
    }
  })

  log(`seed complete: ${PRODUCTS.length} products`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await seed({ force: process.argv.includes('--force') })
  } catch (err) {
    console.error(err.message)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}
