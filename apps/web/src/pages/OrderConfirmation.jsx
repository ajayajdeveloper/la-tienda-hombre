import { useLocation, Link } from 'react-router-dom'

function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`
}

export default function OrderConfirmation() {
  const location = useLocation()
  const { order, items } = location.state || {}

  if (!order) {
    return (
      <div className="empty-state">
        <p>No order to show.</p>
        <Link to="/" className="btn-secondary">Continue shopping</Link>
      </div>
    )
  }

  return (
    <div className="confirmation-page">
      <div className="confirmation-badge">✓</div>
      <h1>Order confirmed</h1>
      <p className="confirmation-sub">Order #{order.orderId} — thank you for your purchase.</p>

      <ul className="summary-items">
        {items.map((item) => (
          <li key={item.variantId}>
            <span>{item.name} <em>{item.size}/{item.color} × {item.quantity}</em></span>
            <span>{formatPrice(item.priceCents * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="summary-row">
        <span>Total</span>
        <span>{formatPrice(order.totalCents)}</span>
      </div>

      <Link to="/" className="btn-primary">Continue shopping</Link>
    </div>
  )
}
