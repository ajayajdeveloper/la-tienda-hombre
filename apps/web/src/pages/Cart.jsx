import { useSelector, useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import { updateQuantity, removeItem, clearCart } from '../store/cartSlice.js'
import { selectCartTotalCents } from '../store/cartSelectors.js'

function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`
}

export default function Cart() {
  const items = useSelector((state) => state.cart.items)
  const totalCents = useSelector(selectCartTotalCents)
  const dispatch = useDispatch()

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <p>Your cart is empty.</p>
        <Link to="/" className="btn-secondary">Continue shopping</Link>
      </div>
    )
  }

  return (
    <div className="cart-page">
      <h1>Your cart</h1>
      <div className="cart-layout">
        <ul className="cart-list">
          {items.map((item) => (
            <li key={item.variantId} className="cart-item">
              <div className="cart-thumb">
                <span>{item.name.charAt(0)}</span>
              </div>
              <div>
                <p className="cart-item-name">{item.name}</p>
                <p className="cart-item-meta">{item.size} / {item.color}</p>
                {item.quantity >= item.stockQuantity && (
                  <p className="stock-warning">Only {item.stockQuantity} in stock</p>
                )}
              </div>
              <input
                type="number"
                min="1"
                max={item.stockQuantity}
                value={item.quantity}
                onChange={(e) => {
                  const quantity = Math.min(Number(e.target.value), item.stockQuantity)
                  dispatch(updateQuantity({ variantId: item.variantId, quantity }))
                }}
              />
              <p className="cart-item-price">{formatPrice(item.priceCents * item.quantity)}</p>
              <button className="remove-btn" onClick={() => dispatch(removeItem(item.variantId))} aria-label="Remove item">
                ×
              </button>
            </li>
          ))}
        </ul>

        <aside className="cart-summary">
          <h2>Order summary</h2>
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatPrice(totalCents)}</span>
          </div>
          <p className="summary-note">Shipping and taxes calculated at checkout.</p>
          <Link to="/checkout" className="btn-primary btn-block">Proceed to checkout</Link>
          <button className="btn-text" onClick={() => dispatch(clearCart())}>Clear cart</button>
        </aside>
      </div>
    </div>
  )
}
