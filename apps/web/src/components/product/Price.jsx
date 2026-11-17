import { discountPercent, formatPrice } from '../../lib/format.js'
import styles from './Price.module.css'

/** Selling price, MRP struck through, and % off, the standard Indian e-commerce price block. */
export default function Price({ priceCents, compareAtCents, size = 'md' }) {
  const off = discountPercent(priceCents, compareAtCents)
  return (
    <p className={`${styles.price} ${styles[size]}`}>
      <span className={styles.now}>{formatPrice(priceCents)}</span>
      {off > 0 && (
        <>
          <s className={styles.mrp}>
            <span className="visually-hidden">MRP </span>
            {formatPrice(compareAtCents)}
          </s>
          <span className={styles.off}>{off}% off</span>
        </>
      )}
    </p>
  )
}
