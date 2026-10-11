import { Router } from 'express'
import { pool } from '../db/pool.js'

export const productsRouter = Router()

productsRouter.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.slug, p.description, p.base_price_cents, c.slug AS category_slug
     FROM products p
     JOIN categories c ON c.id = p.category_id
     ORDER BY p.id`
  )
  res.json(rows)
})


productsRouter.get('/:slug', async (req, res) => {
    const { rows } = await pool.query(
      `SELECT p.id, p.name, p.slug, p.description, p.base_price_cents, c.slug AS category_slug
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.slug = $1`,
      [req.params.slug]
    )
    const product = rows[0]
  
    if (!product) {
      return res.status(404).json({ error: 'not found' })
    }
  
    const { rows: variants } = await pool.query(
      `SELECT id, size, color, sku, stock_quantity
       FROM product_variants
       WHERE product_id = $1
       ORDER BY size, color`,
      [product.id]
    )
  
    res.json({ ...product, variants })
  })
  
