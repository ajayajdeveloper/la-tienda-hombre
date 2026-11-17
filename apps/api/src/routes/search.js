import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db/pool.js'
import { validate } from '../lib/validate.js'
import { cacheFor } from '../middleware/cache.js'
import { CARD_JOINS, CARD_SELECT, toPrefixTsQuery } from '../services/productQuery.js'

export const searchRouter = Router()

const suggestQuery = z.object({ q: z.string().trim().min(1).max(100) })

// Typeahead: called on every (debounced) keystroke, so it returns a small,
// fixed-size payload: 6 products + up to 4 matching categories.
searchRouter.get('/suggest', cacheFor(60), async (req, res) => {
  const { q } = validate(suggestQuery, req.query)
  const tsQuery = toPrefixTsQuery(q)
  if (!tsQuery) return res.json({ products: [], categories: [] })

  const [products, categories] = await Promise.all([
    pool.query(
      `${CARD_SELECT}
       FROM products p
       ${CARD_JOINS}
       WHERE p.is_active AND p.search_vector @@ to_tsquery('english', $1)
       ORDER BY ts_rank(p.search_vector, to_tsquery('english', $1)) DESC, p.sold_count DESC
       LIMIT 6`,
      [tsQuery]
    ),
    // ILIKE is fine here: the categories table has ~20 rows. On a big table this
    // would need a trigram index (pg_trgm) to avoid a full scan.
    pool.query(
      `SELECT c.name, c.slug, parent.name AS parent_name
       FROM categories c LEFT JOIN categories parent ON parent.id = c.parent_id
       WHERE c.name ILIKE '%' || $1 || '%'
       ORDER BY c.parent_id NULLS FIRST, c.name
       LIMIT 4`,
      [q.replace(/[%_\\]/g, '\\$&')] // escape LIKE wildcards in user input
    ),
  ])

  res.json({ products: products.rows, categories: categories.rows })
})
