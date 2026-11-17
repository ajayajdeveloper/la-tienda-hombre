import { createApp } from './app.js'
import { config } from './config.js'
import { pool } from './db/pool.js'

const app = createApp()
const server = app.listen(config.port, () => {
  console.log(`api listening on :${config.port} (${config.env})`)
})

// nginx keeps idle connections to us open for up to 30s and reuses them. Node's
// default idle timeout is 5s, so Node could close a socket at the exact moment
// nginx sends a request on it: an occasional, hard-to-reproduce 502. The rule:
// the backend must keep idle connections open LONGER than the proxy does.
server.keepAliveTimeout = 65_000
server.headersTimeout = 66_000 // must be greater than keepAliveTimeout

// Graceful shutdown. On deploy, the platform sends SIGTERM and waits a few
// seconds before killing the process. We stop accepting new connections, let
// in-flight requests finish (an order mid-transaction completes instead of
// being cut off), close the DB pool, then exit.
let shuttingDown = false
function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`${signal} received, shutting down`)

  // Safety net: if something hangs, exit anyway before the platform's hard kill.
  setTimeout(() => process.exit(1), 10_000).unref()

  server.close(async () => {
    await pool.end()
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

// Last-resort logging for bugs outside any request (e.g. a stray promise).
// Crash and let the platform restart a clean process: after an unknown
// error the in-memory state can't be trusted.
process.on('unhandledRejection', (reason) => {
  console.error('unhandled rejection', reason)
  process.exit(1)
})
