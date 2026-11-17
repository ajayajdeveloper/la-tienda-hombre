import { memo } from 'react'
import { Link } from 'react-router-dom'
import Price from './Price.jsx'
import Rating from './Rating.jsx'
import WishlistButton from './WishlistButton.jsx'
import { Skeleton } from '../ui/Feedback.jsx'
import styles from './ProductCard.module.css'

const BADGE_LABEL = { new: 'New', bestseller: 'Bestseller', limited: 'Limited' }
const MAX_DOTS = 4

/**
 * memo: a listing re-renders when filters change, but a card whose `product`
 * object is the same (RTK Query keeps references stable between renders)
 * skips re-rendering entirely.
 */
function ProductCard({ product, priority = false }) {
  const [front, hover] = product.images
  const extraColors = product.colors.length - MAX_DOTS

  return (
    <article className={styles.card} data-soldout={!product.in_stock}>
      <Link to={`/products/${product.slug}`} className={styles.media}>
        <img
          src={front}
          alt={product.name}
          className={styles.image}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          width="400"
          height="500"
        />
        {hover && <img src={hover} alt="" className={styles.hoverImage} loading="lazy" decoding="async" aria-hidden="true" />}

        <span className={styles.topLeft}>
          {product.badge && (
            <span className={styles.badge} data-badge={product.badge}>
              {BADGE_LABEL[product.badge]}
            </span>
          )}
        </span>
        {product.fit && <span className={styles.fit}>{product.fit}</span>}
        <span className={styles.rating}>
          <Rating average={product.rating_avg} count={product.rating_count} />
        </span>
        {!product.in_stock && <span className={styles.soldOut}>Sold out</span>}
      </Link>

      <span className={styles.wishlist}>
        <WishlistButton productId={product.id} name={product.name} />
      </span>

      <div className={styles.body}>
        <Link to={`/products/${product.slug}`} className={styles.name}>
          {product.name}
        </Link>
        <p className={styles.category}>{product.category_name}</p>
        <Price priceCents={product.price_cents} compareAtCents={product.compare_at_price_cents} />
        {product.colors.length > 1 && (
          <ul className={styles.dots} aria-label={`${product.colors.length} colours`}>
            {product.colors.slice(0, MAX_DOTS).map((color) => (
              <li key={color.name} style={{ background: color.hex }} title={color.name} />
            ))}
            {extraColors > 0 && <li className={styles.more}>+{extraColors}</li>}
          </ul>
        )}
      </div>
    </article>
  )
}

export default memo(ProductCard)

export function ProductCardSkeleton() {
  return (
    <div className={styles.card} aria-hidden="true">
      <Skeleton height="auto" radius="var(--radius)" style={{ aspectRatio: '4 / 5' }} />
      <div className={styles.body}>
        <Skeleton width="80%" />
        <Skeleton width="40%" height="0.8em" />
        <Skeleton width="55%" />
      </div>
    </div>
  )
}
