import { Router } from 'express'
import { pool } from '../db/pool.js'
import { cacheFor } from '../middleware/cache.js'

export const categoriesRouter = Router()

// Returns the full tree: [{ ...parent, children: [...] }].
// The database returns flat rows; the tree is assembled in JS in one pass.
// With two levels and ~20 rows, that is simpler than building JSON in SQL.
categoriesRouter.get('/', cacheFor(300), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT c.id, c.name, c.slug, c.parent_id, c.image_url, c.sort_order,
            count(p.id) FILTER (WHERE p.is_active) AS product_count
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.id
     GROUP BY c.id
     ORDER BY c.sort_order, c.name`
  )

  const byId = new Map(rows.map((row) => [row.id, { ...row, children: [] }]))
  const roots = []
  for (const node of byId.values()) {
    const parent = node.parent_id ? byId.get(node.parent_id) : null
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  // A parent's count = its own products + its children's.
  for (const root of roots) {
    root.product_count += root.children.reduce((sum, child) => sum + child.product_count, 0)
  }

  res.json(roots)
})
