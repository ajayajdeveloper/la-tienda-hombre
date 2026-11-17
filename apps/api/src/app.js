import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { config } from './config.js'
import { pool } from './db/pool.js'
import { CURRENCY, FREE_SHIPPING_THRESHOLD_CENTS, MAX_QUANTITY_PER_LINE, SHIPPING_FEE_CENTS } from './lib/pricing.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { requestLogger } from './middleware/requestLogger.js'
import { cacheFor } from './middleware/cache.js'
import { categoriesRouter } from './routes/categories.js'
import { collectionsRouter } from './routes/collections.js'
import { productsRouter } from './routes/products.js'
import { searchRouter } from './routes/search.js'
import { couponsRouter } from './routes/coupons.js'
import { deliveryRouter } from './routes/delivery.js'
import { ordersRouter } from './routes/orders.js'
import { stockNotificationsRouter } from './routes/stockNotifications.js'

// Builds the app WITHOUT starting a server. server.js calls listen(); tests
// import createApp() and hand it to supertest, which needs no open port.
export function createApp() {
  const app = express()

  app.set('trust proxy', config.trustProxy)
  app.disable('x-powered-by')

  // Order matters: middleware runs top to bottom for every request.
  app.use(helmet())
  app.use(compression())
  app.use(
    cors({
      // No configured origins -> CORS headers are never sent, so only
      // same-origin requests work (production behind nginx).
      origin: config.webOrigins.length ? config.webOrigins : false,
    })
  )
  app.use(express.json({ limit: '50kb' }))
  if (!config.isTest) app.use(requestLogger)

  // Liveness only: "the process is up". Deliberately does NOT touch the
  // database. An uptime pinger hits this every few minutes to keep a free
  // Render instance awake; if it hit /healthz instead, every ping would also
  // wake Neon (which sleeps after 5 idle minutes) and burn its free compute hours.
  app.get('/livez', (req, res) => res.json({ status: 'ok' }))

  // Readiness: also proves the database answers. Platforms (Docker,
  // Render) poll this to decide whether to route traffic to the instance.
  app.get('/healthz', async (req, res) => {
    try {
      await pool.query('SELECT 1')
      res.json({ status: 'ok', db: 'ok' })
    } catch {
      res.status(503).json({ status: 'degraded', db: 'unreachable' })
    }
  })

  // Business constants the UI needs (free-shipping progress bar, quantity
  // caps). Served by the API so the frontend can't drift from the server's rules.
  app.get('/api/settings', cacheFor(300), (req, res) => {
    res.json({
      currency: CURRENCY,
      freeShippingThresholdCents: FREE_SHIPPING_THRESHOLD_CENTS,
      shippingFeeCents: SHIPPING_FEE_CENTS,
      maxQuantityPerLine: MAX_QUANTITY_PER_LINE,
    })
  })

  app.use('/api/categories', categoriesRouter)
  app.use('/api/collections', collectionsRouter)
  app.use('/api/products', productsRouter)
  app.use('/api/search', searchRouter)
  app.use('/api/coupons', couponsRouter)
  app.use('/api/delivery', deliveryRouter)
  app.use('/api/orders', ordersRouter)
  app.use('/api/stock-notifications', stockNotificationsRouter)

  // Express 5: a rejected promise from an async handler is passed to the
  // error handler automatically. In Express 4 it was an unhandled rejection
  // that could crash the whole process.
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
