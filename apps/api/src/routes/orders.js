import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../lib/validate.js'
import { badRequest } from '../lib/httpError.js'
import { MAX_QUANTITY_PER_LINE } from '../lib/pricing.js'
import { orderLimiter } from '../middleware/rateLimits.js'
import { getOrder, placeOrder, quoteOrder } from '../services/orders.js'

export const ordersRouter = Router()

const itemsSchema = z
  .array(
    z.object({
      variantId: z.number().int().positive(),
      quantity: z.number().int().positive().max(MAX_QUANTITY_PER_LINE),
    })
  )
  .min(1)
  .max(20)

const quoteSchema = z.object({
  items: itemsSchema,
  couponCode: z.string().trim().max(30).optional(),
})

// Read-only pricing for the cart/checkout pages. POST because the input is a
// structured list, but it writes nothing and is safe to call repeatedly.
ordersRouter.post('/quote', async (req, res) => {
  res.json(await quoteOrder(validate(quoteSchema, req.body)))
})

const orderSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(120),
    // Indian mobile numbers: 10 digits starting 6-9.
    phone: z.string().trim().regex(/^[6-9][0-9]{9}$/, 'Enter a 10-digit mobile number'),
    address: z.string().trim().min(5).max(200),
    city: z.string().trim().min(2).max(60),
    state: z.string().trim().min(2).max(60),
    pincode: z.string().trim().regex(/^[1-9][0-9]{5}$/, 'Enter a valid 6-digit pincode'),
  }),
  items: itemsSchema,
  couponCode: z.string().trim().max(30).optional(),
  paymentMethod: z.literal('cod').default('cod'),
  // The total the shopper was shown (from /quote). Optional so API clients
  // without a quote still work; the web app always sends it.
  expectedTotalCents: z.number().int().nonnegative().optional(),
})

const idempotencyKey = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/).optional()

ordersRouter.post('/', orderLimiter, async (req, res) => {
  const input = validate(orderSchema, req.body)
  const keyCheck = idempotencyKey.safeParse(req.get('Idempotency-Key') ?? undefined)
  if (!keyCheck.success) throw badRequest('invalid Idempotency-Key header')

  const { order, replayed } = await placeOrder(input, { idempotencyKey: keyCheck.data })
  // 201 for a new order; 200 when the same key was retried and we returned the original.
  res.status(replayed ? 200 : 201).json(order)
})

const uuid = z.string().uuid()

ordersRouter.get('/:publicId', async (req, res) => {
  const publicId = validate(uuid, req.params.publicId)
  res.set('Cache-Control', 'private, no-store') // personal data: never cache in shared caches
  res.json(await getOrder(publicId))
})
