import { rateLimit } from 'express-rate-limit'
import { config } from '../config.js'

// Reads are cheap and cached by the browser, so only endpoints that WRITE to
// the database are limited. The limits are per IP, held in memory: fine for a
// single API instance. With several instances you'd move this to Redis.
function limiter(windowMinutes, limit) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => config.isTest,
    message: { error: 'too many requests, slow down' },
  })
}

export const orderLimiter = limiter(15, 20) // 20 orders / 15 min / IP
export const writeLimiter = limiter(15, 30) // reviews, notify-me, coupon checks
