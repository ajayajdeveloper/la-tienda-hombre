import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import { categoriesRouter } from './routes/categories.js'
import { productsRouter } from './routes/product.js'
import { ordersRouter } from './routes/orders.js'



const app = express()

app.use(express.json())

app.use(cors({ origin: process.env.WEB_ORIGIN }))


app.get('/healthz', (req, res) => {
    res.json({ status: 'ok' })
})

app.use('/api/categories', categoriesRouter)
app.use('/api/products', productsRouter)
app.use('/api/orders', ordersRouter)



const port = process.env.PORT

app.listen(port, () => {
  console.log(`api listening on http://localhost:${port}`)
})
