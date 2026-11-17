import pg from 'pg'
import { config } from '../config.js'

// Postgres returns BIGINT (e.g. COUNT(*)) and NUMERIC (e.g. AVG()) as strings,
// because they can exceed JS number precision. Our counts and averages are
// small, so parse them into numbers once here instead of in every route.
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => Number.parseInt(v, 10))
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (v) => Number.parseFloat(v))

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: config.dbPoolMax,
  // Fail fast instead of hanging forever when the DB is unreachable.
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
})

// An idle client can error (e.g. the DB restarts). Without this listener the
// error is unhandled and crashes the process; with it, the pool just discards
// that client and opens a new one on the next query.
pool.on('error', (err) => {
  console.error('idle postgres client error', err.message)
})

// Run `fn` inside a transaction on a dedicated client. Commits if `fn`
// resolves, rolls back if it throws, and always returns the client to the pool.
export async function withTransaction(fn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
