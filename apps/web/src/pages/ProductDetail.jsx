import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { getProduct } from '../api.js'
import { addItem } from '../store/cartSlice.js'

function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`
}

export default function ProductDetail() {
  const { slug } = useParams()
  const dispatch = useDispatch()
  const [product, setProduct] = useState(null)
  const [status, setStatus] = useState('loading')
  const [selectedVariantId, setSelectedVariantId] = useState(null)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setSelectedVariantId(null)

    getProduct(slug)
      .then((data) => {
        if (cancelled) return
        setProduct(data)
        setStatus('ready')
      })
      .catch(() => {
        if (cancelled) return
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  if (status === 'loading') return <p className="status-message">Loading product...</p>
  if (status === 'error') return <p className="status-message">Product not found.</p>

  function handleAddToCart() {
    const variant = product.variants.find((v) => v.id === selectedVariantId)
    if (!variant) return

    dispatch(
      addItem({
        variantId: variant.id,
        productId: product.id,
        name: product.name,
        slug: product.slug,
        size: variant.size,
        color: variant.color,
        priceCents: product.base_price_cents,
        stockQuantity: variant.stock_quantity,
      })
    )
  }

  return (
    <div className="product-detail">
      <div className={`product-detail-media thumb-${product.category_slug}`}>
        <span className="thumb-mono">{product.name.charAt(0)}</span>
      </div>

      <div className="product-detail-info">
        <p className="eyebrow">{product.category_slug}</p>
        <h1>{product.name}</h1>
        <p className="price">{formatPrice(product.base_price_cents)}</p>
        <p className="description">{product.description}</p>

        <p className="variant-label">Select size / color</p>
        <div className="variant-options">
          {product.variants.map((variant) => (
            <label
              key={variant.id}
              className={`variant-chip${variant.stock_quantity === 0 ? ' is-disabled' : ''}`}
            >
              <input
                type="radio"
                name="variant"
                checked={selectedVariantId === variant.id}
                onChange={() => setSelectedVariantId(variant.id)}
                disabled={variant.stock_quantity === 0}
              />
              <span>{variant.size} / {variant.color}</span>
              {variant.stock_quantity === 0 && <em>Sold out</em>}
            </label>
          ))}
        </div>

        <button className="btn-primary" onClick={handleAddToCart} disabled={!selectedVariantId}>
          Add to cart
        </button>
      </div>
    </div>
  )
}
