import { HttpError } from '../lib/httpError.js'
import { config } from '../config.js'

// Express recognises error middleware by its 4 arguments, so `next` must stay
// in the signature even though it is unused.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Malformed JSON body: express.json() throws a SyntaxError with status 400.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'malformed JSON body' })
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details })
  }

  // Unknown error = a bug. Log the full stack for us, but never leak internals
  // (SQL, file paths, stack traces) to the client in production.
  console.error(`[${req.method} ${req.originalUrl}]`, err)
  res.status(500).json({
    error: 'internal server error',
    ...(config.isProduction ? {} : { message: err.message }),
  })
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: `no route for ${req.method} ${req.path}` })
}
