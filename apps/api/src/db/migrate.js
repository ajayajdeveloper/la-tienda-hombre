import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { pool } from './pool.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8')

await pool.query(schema)
console.log('migration complete')
await pool.end()
