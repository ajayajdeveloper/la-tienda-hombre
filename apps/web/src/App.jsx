import { Routes, Route, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import ProductList from './pages/ProductList.jsx'
import ProductDetail from './pages/ProductDetail.jsx'
import Cart from './pages/Cart.jsx'
import { selectCartItemCount } from './store/cartSelectors.js'
import Checkout from './pages/Checkout.jsx'
import OrderConfirmation from './pages/OrderConfirmation.jsx'

export default function App() {
  const itemCount = useSelector(selectCartItemCount)

  return (
    <div className="app">
      <header className="site-header">
        <Link to="/" className="brand">
          <span className="brand-name">La Tienda Hombre</span>
          <span className="brand-tag">Menswear</span>
        </Link>
        <Link to="/cart" className="cart-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 8h12l-1 12H7L6 8z" />
            <path d="M9 8V6a3 3 0 0 1 6 0v2" />
          </svg>
          <span className="cart-count">{itemCount}</span>
        </Link>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<ProductList />} />
          <Route path="/products/:slug" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-confirmation" element={<OrderConfirmation />} />
        </Routes>
      </main>
    </div>
  )
}
