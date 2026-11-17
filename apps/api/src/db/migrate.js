import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { pool } from './pool.js'

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations')

// Any constant works. Every process that runs migrations uses the same key, so
// pg_advisory_lock makes them take turns: if two app containers boot at once,
// the second waits, then sees the migrations are already applied.
const LOCK_KEY = 74_201_117

export async function migrate({ log = console.log } = {}) {
  const client = await pool.connect()
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_KEY])

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`)

    const { rows } = await client.query('SELECT name FROM schema_migrations')
    const applied = new Set(rows.map((r) => r.name))

    // Zero-padded names (001_, 002_) make string order = numeric order.
    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort()

    let count = 0
    for (const file of files) {
      if (applied.has(file)) continue

      const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8')
      // One transaction per migration: it applies completely or not at all.
      // Postgres supports transactional DDL (CREATE/ALTER TABLE), unlike MySQL.
      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
        await client.query('COMMIT')
      } catch (err) {
        await client.query('ROLLBACK')
        throw new Error(`migration ${file} failed: ${err.message}`)
      }
      log(`applied ${file}`)
      count += 1
    }

    log(count === 0 ? 'migrations: up to date' : `migrations: applied ${count}`)
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]).catch(() => {})
    client.release()
  }
}

// Run directly (`node src/db/migrate.js`) -> migrate and exit.
// Imported (tests) -> just export the function.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await migrate()
  } catch (err) {
    console.error(err.message)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}
