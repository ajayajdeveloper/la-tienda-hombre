import pg from 'pg'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { pool } from '../src/db/pool.js'
import { migrate } from '../src/db/migrate.js'
import { seed } from '../src/db/seed.js'

export const app = createApp()
export const api = () => request(app)
export { pool }

// Create the test database if it doesn't exist yet. CREATE DATABASE can't run
// inside the target database itself, so connect to the default one.
async function ensureTestDatabase() {
  const url = new URL(process.env.DATABASE_URL)
  const dbName = url.pathname.slice(1)
  url.pathname = '/postgres'
  const admin = new pg.Client({ connectionString: url.toString() })
  await admin.connect()
  try {
    const { rows } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName])
    if (!rows.length) await admin.query(`CREATE DATABASE "${dbName}"`)
  } finally {
    await admin.end()
  }
}

/** Fresh, known data for each test file. */
export async function resetDatabase() {
  await ensureTestDatabase()
  await migrate({ log: () => {} })
  await seed({ log: () => {}, force: true })
}

export async function variantWithStock(minStock = 5) {
  const { rows: [v] } = await pool.query(
    `SELECT v.id, v.stock_quantity, p.base_price_cents, p.id AS product_id, p.sold_count
     FROM product_variants v JOIN products p ON p.id = v.product_id
     WHERE v.stock_quantity >= $1 ORDER BY v.id LIMIT 1`,
    [minStock]
  )
  return v
}

export async function setStock(variantId, quantity) {
  await pool.query('UPDATE product_variants SET stock_quantity = $1 WHERE id = $2', [quantity, variantId])
}

export async function stockOf(variantId) {
  const { rows: [v] } = await pool.query('SELECT stock_quantity FROM product_variants WHERE id = $1', [variantId])
  return v.stock_quantity
}

export const customer = {
  name: 'Test Shopper',
  email: 'shopper@example.com',
  phone: '9876543210',
  address: '12 MG Road, Indiranagar',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560038',
}

export function orderBody(items, extra = {}) {
  return { customer, items, ...extra }
}
