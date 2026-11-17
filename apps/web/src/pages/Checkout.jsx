import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { clearCart } from '../store/cartSlice.js'
import { selectCartTotalCents } from '../store/cartSelectors.js'
import { createOrder } from '../api.js'

function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`
}

export default function Checkout() {
  const items = useSelector((state) => state.cart.items)
  const totalCents = useSelector(selectCartTotalCents)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('submitting')
    setError(null)

    try {
      const order = await createOrder({
        customerName,
        customerEmail,
        shippingAddress,
        items: items.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
        })),
      })

      dispatch(clearCart())
      navigate('/order-confirmation', { state: { order, items } })
    } catch (err) {
      setStatus('idle')
      setError(err.message)
    }
  }

  if (items.length === 0) {
    return <p className="status-message">Your cart is empty.</p>
  }

  return (
    <div className="checkout-page">
      <form className="checkout-form" onSubmit={handleSubmit}>
        <h1>Checkout</h1>

        <label>
          Name
          <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
        </label>

        <label>
          Email
          <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} required />
        </label>

        <label>
          Shipping address
          <textarea value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} required />
        </label>

        {error && <p className="checkout-error">{error}</p>}

        <button type="submit" className="btn-primary btn-block" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Placing order…' : `Place order — ${formatPrice(totalCents)}`}
        </button>
      </form>

      <aside className="cart-summary">
        <h2>Order summary</h2>
        <ul className="summary-items">
          {items.map((item) => (
            <li key={item.variantId}>
              <span>{item.name} <em>× {item.quantity}</em></span>
              <span>{formatPrice(item.priceCents * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="summary-row">
          <span>Total</span>
          <span>{formatPrice(totalCents)}</span>
        </div>
      </aside>
    </div>
  )
}
