import { Link, useLocation, useParams } from 'react-router-dom'
import { errorMessage, useGetOrderQuery } from '../store/apiSlice.js'
import { formatDeliveryDate, formatLongDate, formatPrice } from '../lib/format.js'
import { useDocumentTitle } from '../lib/hooks.js'
import OrderSummary from '../components/checkout/OrderSummary.jsx'
import Icon from '../components/ui/Icon.jsx'
import { EmptyState, ErrorMessage, Skeleton } from '../components/ui/Feedback.jsx'
import styles from './OrderConfirmation.module.css'

/**
 * v1 read the order from navigation state, so a refresh lost it. v2 loads it
 * from GET /api/orders/:publicId: refresh, bookmark, or open it from an email.
 */
export default function OrderConfirmation() {
  const { publicId } = useParams()
  const { state } = useLocation()
  const { data: order, error, isLoading, refetch } = useGetOrderQuery(publicId)
  useDocumentTitle('Order confirmed')

  if (isLoading) {
    return (
      <div className={`container page ${styles.page}`}>
        <Skeleton height="10rem" />
      </div>
    )
  }
  if (error?.status === 404 || error?.status === 400) {
    return (
      <div className="container page">
        <EmptyState icon="search" title="Order not found" action={<Link to="/" className="btn btn-primary">Go to the homepage</Link>}>
          Check the link in your confirmation email.
        </EmptyState>
      </div>
    )
  }
  if (error) {
    return (
      <div className="container page">
        <ErrorMessage onRetry={refetch}>{errorMessage(error)}</ErrorMessage>
      </div>
    )
  }

  const totals = {
    subtotalCents: order.subtotal_cents,
    discountCents: order.discount_cents,
    shippingCents: order.shipping_cents,
    totalCents: order.total_cents,
    couponCode: order.coupon_code,
  }
  const reference = order.public_id.slice(0, 8).toUpperCase()

  return (
    <div className={`container page ${styles.page}`}>
      <header className={styles.hero}>
        <span className={styles.check}>
          <Icon name="check" size={28} strokeWidth={2.4} />
        </span>
        <h1 className={styles.title}>{state?.justPlaced ? 'Thank you! Your order is confirmed.' : 'Your order'}</h1>
        <p className={styles.sub}>
          Order <strong>#{reference}</strong> · placed {formatLongDate(order.created_at)}
        </p>
        <p className={styles.eta}>
          <Icon name="truck" size={18} /> Estimated delivery <strong>{formatDeliveryDate(order.estimated_delivery_date)}</strong>
        </p>
      </header>

      <div className={styles.layout}>
        <section className={styles.details}>
          <h2 className={styles.h2}>Items</h2>
          <ul className={styles.items}>
            {order.items.map((item) => (
              <li key={`${item.variant_id}`}>
                {item.image && <img src={item.image} alt="" />}
                <span className={styles.itemInfo}>
                  {item.slug ? <Link to={`/products/${item.slug}`}>{item.product_name}</Link> : item.product_name}
                  <span>
                    {item.color} / {item.size} · Qty {item.quantity}
                  </span>
                </span>
                <span className="tabular">{formatPrice(item.unit_price_cents * item.quantity)}</span>
              </li>
            ))}
          </ul>

          <div className={styles.columns}>
            <div>
              <h2 className={styles.h2}>Delivering to</h2>
              <p>{order.customer_name}</p>
              <p className={styles.muted}>{order.shipping_address} – {order.pincode}</p>
              <p className={styles.muted}>{order.customer_phone}</p>
            </div>
            <div>
              <h2 className={styles.h2}>Payment</h2>
              <p>Cash on delivery</p>
              <p className={styles.muted}>Pay {formatPrice(order.total_cents)} when it arrives.</p>
            </div>
          </div>
          <p className={styles.muted}>
            A real store would email this to {order.customer_email}. This demo doesn't send email, so bookmark this page to see your order again.
          </p>
        </section>

        <div className={styles.side}>
          <OrderSummary totals={totals} title="Payment summary" />
          <Link to="/shop" className="btn btn-primary btn-block">Continue shopping</Link>
        </div>
      </div>
    </div>
  )
}
