import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { selectCartItems, selectCartSubtotal, selectCouponCode } from '../store/cartSelectors.js'
import { applyCoupon, reconcileWithQuote, removeItem, updateQuantity } from '../store/cartSlice.js'
import { useCartQuote } from '../lib/useCartQuote.js'
import { formatPrice } from '../lib/format.js'
import { useDocumentTitle } from '../lib/hooks.js'
import OrderSummary from '../components/checkout/OrderSummary.jsx'
import OfferCards from '../components/pdp/OfferCards.jsx'
import { FreeShippingProgress } from '../components/layout/CartDrawer.jsx'
import QuantityStepper from '../components/ui/QuantityStepper.jsx'
import Icon from '../components/ui/Icon.jsx'
import { EmptyState } from '../components/ui/Feedback.jsx'
import { RecentlyViewed } from '../components/home/HomeSections.jsx'
import styles from './Cart.module.css'

export default function Cart() {
  useDocumentTitle('Your bag')
  const items = useSelector(selectCartItems)
  const subtotal = useSelector(selectCartSubtotal)
  const couponCode = useSelector(selectCouponCode)
  const dispatch = useDispatch()
  const { quote, totals, problems, hasProblems, couponProblem, priceOf, isFetching } = useCartQuote()

  if (items.length === 0) {
    return (
      <div className="container page">
        <EmptyState title="Your bag is empty" action={<Link to="/shop" className="btn btn-primary">Start shopping</Link>}>
          Browse the new arrivals, or pick up where you left off below.
        </EmptyState>
        <RecentlyViewed />
      </div>
    )
  }

  return (
    <div className={`container page ${styles.page}`}>
      <h1 className="page-title">Your bag</h1>

      {hasProblems && (
        <div className={styles.alert} role="alert">
          <p>Some items changed since you added them.</p>
          <button className="btn btn-outline btn-sm" onClick={() => dispatch(reconcileWithQuote(quote))}>
            Update my bag
          </button>
        </div>
      )}

      <div className={styles.layout}>
        <div>
          <FreeShippingProgress subtotal={quote?.subtotalCents ?? subtotal} />
          <ul className={styles.list}>
            {items.map((item) => {
              const problem = problems.get(item.variantId)
              return (
                <li key={item.variantId} className={styles.item} data-problem={Boolean(problem)}>
                  <Link to={`/products/${item.slug}?color=${encodeURIComponent(item.color)}`} className={styles.thumb}>
                    <img src={item.image} alt="" />
                  </Link>
                  <div className={styles.info}>
                    <Link to={`/products/${item.slug}?color=${encodeURIComponent(item.color)}`} className={styles.name}>
                      {item.name}
                    </Link>
                    <p className={styles.meta}>
                      Colour: {item.color} · Size: {item.size}
                    </p>
                    {problem && <p className={styles.problem}>{problem}</p>}
                    <div className={styles.controls}>
                      <QuantityStepper
                        value={item.quantity}
                        max={Math.min(10, item.stockQuantity ?? 10)}
                        onChange={(quantity) => dispatch(updateQuantity({ variantId: item.variantId, quantity }))}
                        label={item.name}
                      />
                      <button className={`${styles.remove} link`} onClick={() => dispatch(removeItem(item.variantId))}>
                        Remove
                      </button>
                    </div>
                  </div>
                  <p className={styles.price}>{formatPrice(priceOf(item) * item.quantity)}</p>
                </li>
              )
            })}
          </ul>
          <OfferCards onApply={(code) => dispatch(applyCoupon(code))} appliedCode={quote?.coupon?.ok ? quote.coupon.code : null} />
        </div>

        <OrderSummary totals={totals} loading={!quote && isFetching}>
          <CouponField
            appliedCode={couponCode}
            result={quote?.coupon}
            onApply={(code) => dispatch(applyCoupon(code))}
            onRemove={() => dispatch(applyCoupon(null))}
          />
        </OrderSummary>
      </div>

      <div className={styles.checkoutBar}>
        <Link to="/checkout" className="btn btn-primary btn-block" aria-disabled={hasProblems || Boolean(couponProblem)} onClick={(e) => (hasProblems || couponProblem) && e.preventDefault()}>
          Checkout {totals && `· ${formatPrice(totals.totalCents)}`} <Icon name="arrowRight" size={16} />
        </Link>
      </div>
    </div>
  )
}

function CouponField({ appliedCode, result, onApply, onRemove }) {
  const [code, setCode] = useState('')

  if (appliedCode) {
    return (
      <div className={styles.coupon} data-ok={result?.ok}>
        <p>
          <Icon name={result?.ok === false ? 'close' : 'tag'} size={16} />
          <strong>{appliedCode}</strong> {result?.ok ? 'applied' : ''}
        </p>
        {result?.ok === false && <p className={styles.couponReason}>{result.reason}</p>}
        <button className="link" onClick={onRemove}>Remove</button>
      </div>
    )
  }

  return (
    <form
      className={styles.couponForm}
      onSubmit={(e) => {
        e.preventDefault()
        if (code.trim()) onApply(code)
        setCode('')
      }}
    >
      <input className="input" placeholder="Coupon code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} aria-label="Coupon code" />
      <button className="btn btn-outline btn-sm" disabled={!code.trim()}>Apply</button>
    </form>
  )
}
