import { Router } from 'express'
import { badRequest, notFound } from '../lib/httpError.js'
import { cacheFor } from '../middleware/cache.js'
import { PINCODE_PATTERN, estimateDate, findDeliveryZone } from '../services/delivery.js'

export const deliveryRouter = Router()

deliveryRouter.get('/:pincode', cacheFor(3600), async (req, res) => {
  const { pincode } = req.params
  if (!PINCODE_PATTERN.test(pincode)) throw badRequest('Enter a valid 6-digit pincode.')

  const zone = await findDeliveryZone(pincode)
  if (!zone) throw notFound('We do not deliver to this pincode yet.')

  res.json({
    pincode,
    region: zone.region,
    deliveryDays: zone.delivery_days,
    estimatedDate: estimateDate(zone.delivery_days),
    codAvailable: zone.cod_available,
  })
})
