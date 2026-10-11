
import { Router } from 'express'
import { pool } from '../db/pool.js'

export const categoriesRouter = Router()

categoriesRouter.get('/', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, slug FROM categories ORDER BY name'
  )
  res.json(rows)
})
