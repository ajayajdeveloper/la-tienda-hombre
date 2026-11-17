import { Router } from 'express'
import { pool } from '../db/pool.js'
import { notFound } from '../lib/httpError.js'
import { cacheFor } from '../middleware/cache.js'

export const collectionsRouter = Router()

const COLLECTION_SELECT = `
  SELECT col.name, col.slug, col.tagline, col.image_url, count(pc.product_id) AS product_count
  FROM collections col
  LEFT JOIN product_collections pc ON pc.collection_id = col.id`

collectionsRouter.get('/', cacheFor(300), async (req, res) => {
  const { rows } = await pool.query(`${COLLECTION_SELECT} GROUP BY col.id ORDER BY col.sort_order`)
  res.json(rows)
})

collectionsRouter.get('/:slug', cacheFor(300), async (req, res) => {
  const { rows } = await pool.query(`${COLLECTION_SELECT} WHERE col.slug = $1 GROUP BY col.id`, [req.params.slug])
  if (!rows[0]) throw notFound('collection not found')
  res.json(rows[0])
})
