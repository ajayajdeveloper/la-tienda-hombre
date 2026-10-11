import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProducts } from '../api.js'

function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`
}

export default function ProductList() {
  const [products, setProducts] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let cancelled = false

    getProducts()
      .then((data) => {
        if (cancelled) return
        setProducts(data)
        setStatus('ready')
      })
      .catch(() => {
        if (cancelled) return
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (status === 'loading') return <p className="status-message">Loading products...</p>
  if (status === 'error') return <p className="status-message">Something went wrong loading products.</p>

  return (
    <>
      <div className="shop-hero">
        <p className="eyebrow">New Arrivals</p>
        <h1>Menswear, built to last.</h1>
      </div>
      <div className="product-grid">
        {products.map((product) => (
          <Link key={product.id} to={`/products/${product.slug}`} className="product-card">
            <div className={`product-thumb thumb-${product.category_slug}`}>
              <span className="thumb-mono">{product.name.charAt(0)}</span>
            </div>
            <div className="product-card-body">
              <p className="category">{product.category_slug}</p>
              <h3>{product.name}</h3>
              <p className="price">{formatPrice(product.base_price_cents)}</p>
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}
