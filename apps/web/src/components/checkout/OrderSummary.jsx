import { formatPrice } from '../../lib/format.js'
import { Skeleton } from '../ui/Feedback.jsx'
import styles from './OrderSummary.module.css'

/**
 * Price breakdown from a SERVER quote (or a placed order). This component never
 * adds up prices itself; it only displays numbers the API computed.
 */
export default function OrderSummary({ totals, loading, children, title = 'Order summary' }) {
  return (
    <aside className={styles.summary}>
      <h2 className={styles.title}>{title}</h2>
      {children}
      {loading || !totals ? (
        <div className={styles.rows}>
          <Skeleton height="1.2em" />
          <Skeleton height="1.2em" width="70%" />
          <Skeleton height="1.6em" />
        </div>
      ) : (
        <dl className={styles.rows}>
          <div>
            <dt>Subtotal</dt>
            <dd>{formatPrice(totals.subtotalCents)}</dd>
          </div>
          {totals.discountCents > 0 && (
            <div className={styles.discount}>
              <dt>Discount{totals.couponCode && ` (${totals.couponCode})`}</dt>
              <dd>−{formatPrice(totals.discountCents)}</dd>
            </div>
          )}
          <div>
            <dt>Shipping</dt>
            <dd>{totals.shippingCents === 0 ? <span className={styles.free}>Free</span> : formatPrice(totals.shippingCents)}</dd>
          </div>
          <div className={styles.total}>
            <dt>Total</dt>
            <dd>{formatPrice(totals.totalCents)}</dd>
          </div>
          {totals.discountCents > 0 && (
            <p className={styles.saved}>You save {formatPrice(totals.discountCents)} on this order</p>
          )}
        </dl>
      )}
    </aside>
  )
}
