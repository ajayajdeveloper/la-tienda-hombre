import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { selectCartCount, selectCartItems, selectCartSubtotal } from '../../store/cartSelectors.js'
import { removeItem, updateQuantity } from '../../store/cartSlice.js'
import { useGetSettingsQuery } from '../../store/apiSlice.js'
import { formatPrice } from '../../lib/format.js'
import Drawer from '../ui/Drawer.jsx'
import Icon from '../ui/Icon.jsx'
import { EmptyState } from '../ui/Feedback.jsx'
import QuantityStepper from '../ui/QuantityStepper.jsx'
import styles from './CartDrawer.module.css'

export default function CartDrawer({ open, onClose }) {
  const items = useSelector(selectCartItems)
  const count = useSelector(selectCartCount)
  const subtotal = useSelector(selectCartSubtotal)
  const dispatch = useDispatch()

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Your bag (${count})`}
      footer={
        items.length > 0 && (
          <>
            <div className={styles.subtotal}>
              <span>Subtotal</span>
              <span className="tabular">{formatPrice(subtotal)}</span>
            </div>
            <p className={styles.note}>Coupons and shipping are calculated at checkout.</p>
            <div className={styles.buttons}>
              <Link to="/cart" className="btn btn-outline" onClick={onClose}>
                View bag
              </Link>
              <Link to="/checkout" className="btn btn-primary" onClick={onClose}>
                Checkout
              </Link>
            </div>
          </>
        )
      }
    >
      {items.length === 0 ? (
        <EmptyState
          title="Your bag is empty"
          action={
            <Link to="/shop" className="btn btn-primary" onClick={onClose}>
              Start shopping
            </Link>
          }
        >
          Find something you like and it will show up here.
        </EmptyState>
      ) : (
        <>
          <FreeShippingProgress subtotal={subtotal} />
          <ul className={styles.list}>
            {items.map((item) => (
              <li key={item.variantId} className={styles.item}>
                <Link to={`/products/${item.slug}`} onClick={onClose} className={styles.thumb}>
                  <img src={item.image} alt="" />
                </Link>
                <div className={styles.info}>
                  <Link to={`/products/${item.slug}`} onClick={onClose} className={styles.name}>
                    {item.name}
                  </Link>
                  <p className={styles.meta}>
                    {item.color} / {item.size}
                  </p>
                  <div className={styles.row}>
                    <QuantityStepper
                      value={item.quantity}
                      max={Math.min(10, item.stockQuantity ?? 10)}
                      onChange={(quantity) => dispatch(updateQuantity({ variantId: item.variantId, quantity }))}
                      label={item.name}
                    />
                    <span className="tabular">{formatPrice(item.priceCents * item.quantity)}</span>
                  </div>
                  {item.stockQuantity != null && item.stockQuantity <= 3 && (
                    <p className={styles.low}>Only {item.stockQuantity} left</p>
                  )}
                </div>
                <button className={styles.remove} onClick={() => dispatch(removeItem(item.variantId))} aria-label={`Remove ${item.name}`}>
                  <Icon name="close" size={16} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Drawer>
  )
}

/** "Add ₹240 more for free shipping" with a progress bar. Threshold comes from the API. */
export function FreeShippingProgress({ subtotal }) {
  const { data: settings } = useGetSettingsQuery()
  if (!settings) return null
  const threshold = settings.freeShippingThresholdCents
  const remaining = threshold - subtotal
  const progress = Math.min(100, (subtotal / threshold) * 100)

  return (
    <div className={styles.shipping}>
      <p>
        {remaining > 0 ? (
          <>
            Add <strong>{formatPrice(remaining)}</strong> more for <strong>free shipping</strong>
          </>
        ) : (
          <>
            <Icon name="truck" size={16} /> You've unlocked <strong>free shipping</strong>
          </>
        )}
      </p>
      <div className={styles.track} role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to free shipping">
        <div className={styles.bar} style={{ width: `${progress}%` }} data-done={remaining <= 0} />
      </div>
    </div>
  )
}
