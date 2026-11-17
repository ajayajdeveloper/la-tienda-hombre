import { Router } from 'express'
import { z } from 'zod'
import { pool, withTransaction } from '../db/pool.js'
import { notFound } from '../lib/httpError.js'
import { validate } from '../lib/validate.js'
import { cacheFor } from '../middleware/cache.js'
import { writeLimiter } from '../middleware/rateLimits.js'
import { CARD_JOINS, CARD_SELECT, SORTS, listProducts } from '../services/productQuery.js'

export const productsRouter = Router()

// "M,L" -> ['M', 'L']. Query strings are always strings, so lists arrive
// comma-separated and numbers arrive as text; zod coerces both.
const csv = z
  .string()
  .optional()
  .transform((s) => (s ? s.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 30) : []))

const listQuery = z.object({
  category: z.string().max(80).optional(),
  collection: z.string().max(80).optional(),
  q: z.string().max(100).optional(),
  sizes: csv,
  colors: csv,
  ids: csv.transform((ids) => ids.map(Number).filter((n) => Number.isInteger(n) && n > 0 && n <= 2_147_483_647)),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  onSale: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
  sort: z.enum(Object.keys(SORTS)).optional(),
  page: z.coerce.number().int().min(1).max(500).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(24),
})

productsRouter.get('/', cacheFor(30), async (req, res) => {
  const filters = validate(listQuery, req.query)
  res.json(await listProducts(filters))
})

productsRouter.get('/:slug', cacheFor(30), async (req, res) => {
  const { rows: [product] } = await pool.query(
    `SELECT p.id, p.name, p.slug, p.description, p.base_price_cents AS price_cents,
            p.compare_at_price_cents, p.badge, p.fit, p.fabric, p.highlights, p.care,
            p.rating_count,
            CASE WHEN p.rating_count > 0 THEN round(p.rating_sum::numeric / p.rating_count, 1) END AS rating_avg,
            json_build_object('slug', c.slug, 'name', c.name) AS category,
            CASE WHEN parent.id IS NOT NULL
                 THEN json_build_object('slug', parent.slug, 'name', parent.name) END AS parent_category
     FROM products p
     JOIN categories c ON c.id = p.category_id
     LEFT JOIN categories parent ON parent.id = c.parent_id
     WHERE p.slug = $1 AND p.is_active`,
    [req.params.slug]
  )
  if (!product) throw notFound('product not found')

  // Independent queries -> run them in parallel on separate pool connections.
  const [images, variants] = await Promise.all([
    pool.query(
      'SELECT url, color, alt FROM product_images WHERE product_id = $1 ORDER BY sort_order',
      [product.id]
    ),
    pool.query(
      `SELECT id, size, color, color_hex, sku, stock_quantity
       FROM product_variants
       WHERE product_id = $1
       ORDER BY min(id) OVER (PARTITION BY color), size_order`,
      [product.id]
    ),
  ])

  const { id, ...rest } = product
  res.json({ id, ...rest, images: images.rows, variants: variants.rows })
})

productsRouter.get('/:slug/similar', cacheFor(60), async (req, res) => {
  // Same subcategory first, then the rest of the parent category, by popularity.
  const { rows } = await pool.query(
    `WITH me AS (
       SELECT p.id, p.category_id, c.parent_id
       FROM products p JOIN categories c ON c.id = p.category_id
       WHERE p.slug = $1
     )
     ${CARD_SELECT}
     FROM products p
     ${CARD_JOINS}
     CROSS JOIN me
     WHERE p.is_active AND p.id <> me.id
       AND (p.category_id = me.category_id OR c.parent_id = me.parent_id)
     ORDER BY (p.category_id = me.category_id) DESC, p.sold_count DESC
     LIMIT 8`,
    [req.params.slug]
  )
  res.json(rows)
})

// ------------------------------------------------------------------- reviews
const reviewsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  sort: z.enum(['newest', 'highest', 'lowest']).default('newest'),
})
const REVIEW_SORTS = {
  newest: 'r.created_at DESC',
  highest: 'r.rating DESC, r.created_at DESC',
  lowest: 'r.rating ASC, r.created_at DESC',
}
const REVIEWS_PER_PAGE = 5

productsRouter.get('/:slug/reviews', async (req, res) => {
  const { page, sort } = validate(reviewsQuery, req.query)
  const { rows: [product] } = await pool.query('SELECT id FROM products WHERE slug = $1', [req.params.slug])
  if (!product) throw notFound('product not found')

  const [items, summary] = await Promise.all([
    pool.query(
      `SELECT r.id, r.rating, r.title, r.body, r.author_name, r.created_at
       FROM reviews r WHERE r.product_id = $1
       ORDER BY ${REVIEW_SORTS[sort]}
       LIMIT $2 OFFSET $3`,
      [product.id, REVIEWS_PER_PAGE, (page - 1) * REVIEWS_PER_PAGE]
    ),
    // One pass over the reviews computes the histogram with FILTER clauses.
    pool.query(
      `SELECT count(*) AS count, round(avg(rating), 1) AS average,
              count(*) FILTER (WHERE rating = 5) AS "5",
              count(*) FILTER (WHERE rating = 4) AS "4",
              count(*) FILTER (WHERE rating = 3) AS "3",
              count(*) FILTER (WHERE rating = 2) AS "2",
              count(*) FILTER (WHERE rating = 1) AS "1"
       FROM reviews WHERE product_id = $1`,
      [product.id]
    ),
  ])

  const { count, average, ...distribution } = summary.rows[0]
  res.json({
    items: items.rows,
    page,
    totalPages: Math.max(1, Math.ceil(count / REVIEWS_PER_PAGE)),
    summary: { count, average, distribution },
  })
})

const reviewBody = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(80).default(''),
  body: z.string().trim().max(1000).default(''),
  authorName: z.string().trim().min(1).max(40),
})

productsRouter.post('/:slug/reviews', writeLimiter, async (req, res) => {
  const review = validate(reviewBody, req.body)

  const created = await withTransaction(async (db) => {
    const { rows: [product] } = await db.query('SELECT id FROM products WHERE slug = $1', [req.params.slug])
    if (!product) throw notFound('product not found')

    const { rows: [row] } = await db.query(
      `INSERT INTO reviews (product_id, rating, title, body, author_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, rating, title, body, author_name, created_at`,
      [product.id, review.rating, review.title, review.body, review.authorName]
    )
    // Keep the denormalised counters in step with the reviews table. Same
    // transaction, so they can never disagree.
    await db.query(
      'UPDATE products SET rating_sum = rating_sum + $1, rating_count = rating_count + 1 WHERE id = $2',
      [review.rating, product.id]
    )
    return row
  })

  res.status(201).json(created)
})
