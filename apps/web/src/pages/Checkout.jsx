import { cloneElement, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { selectCartItems, selectCouponCode, selectOrderLines } from '../store/cartSelectors.js'
import { applyCoupon, clearCart, reconcileWithQuote } from '../store/cartSlice.js'
import { errorMessage, useLazyCheckDeliveryQuery, usePlaceOrderMutation } from '../store/apiSlice.js'
import { useCartQuote } from '../lib/useCartQuote.js'
import { formatDeliveryDate, formatPrice } from '../lib/format.js'
import { useDocumentTitle } from '../lib/hooks.js'
import OrderSummary from '../components/checkout/OrderSummary.jsx'
import Icon from '../components/ui/Icon.jsx'
import { EmptyState } from '../components/ui/Feedback.jsx'
import styles from './Checkout.module.css'

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
]

const EMPTY_FORM = { name: '', email: '', phone: '', address: '', city: '', state: '', pincode: '' }

// crypto.randomUUID needs a secure context (https or localhost); fall back otherwise.
function newIdempotencyKey() {
  if (crypto.randomUUID) return crypto.randomUUID()
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')
}

export default function Checkout() {
  useDocumentTitle('Checkout')
  const items = useSelector(selectCartItems)
  const lines = useSelector(selectOrderLines)
  const couponCode = useSelector(selectCouponCode)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const { quote, totals, problems, hasProblems, couponProblem, priceOf, isFetching, refetch } = useCartQuote()
  const [placeOrder, { isLoading: placing, error: orderError }] = usePlaceOrderMutation()
  const [checkDelivery, { data: delivery, error: deliveryError, isFetching: checkingDelivery }] = useLazyCheckDeliveryQuery()

  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  // One key per cart CONTENTS. A double-click or a network retry of the same
  // cart reuses it, so the server creates at most one order. If the shopper
  // changes the cart, it's a different order and gets a new key; otherwise a
  // lost response + edited cart would replay the old order.
  const cartSignature = JSON.stringify({ lines, couponCode })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const idempotencyKey = useMemo(newIdempotencyKey, [cartSignature])

  // Look up delivery as soon as the pincode has 6 digits.
  useEffect(() => {
    if (/^[1-9][0-9]{5}$/.test(form.pincode)) checkDelivery(form.pincode, true)
  }, [form.pincode, checkDelivery])

  if (items.length === 0) {
    return (
      <div className="container page">
        <EmptyState title="Nothing to check out" action={<Link to="/shop" className="btn btn-primary">Continue shopping</Link>}>
          Your bag is empty.
        </EmptyState>
      </div>
    )
  }

  const update = (field) => (event) => {
    const value = field === 'phone' || field === 'pincode' ? event.target.value.replace(/\D/g, '') : event.target.value
    setForm((f) => ({ ...f, [field]: value }))
    setFieldErrors((errors) => ({ ...errors, [field]: undefined }))
  }

  const deliveryOk = delivery && delivery.pincode === form.pincode
  const codBlocked = deliveryOk && !delivery.codAvailable

  async function submit(event) {
    event.preventDefault()
    try {
      const order = await placeOrder({
        idempotencyKey,
        customer: form,
        items: lines,
        couponCode: couponCode ?? undefined,
        paymentMethod: 'cod',
        // The total on screen. If prices changed since, the server answers 409
        // instead of charging an amount the shopper never saw.
        expectedTotalCents: totals.totalCents,
      }).unwrap()
      // Navigate first, then clear: clearing first would briefly render the
      // "Nothing to check out" state.
      navigate(`/orders/${order.public_id}`, { replace: true, state: { justPlaced: true } })
      dispatch(clearCart())
    } catch (err) {
      // 400 with per-field details -> show each message next to its field.
      const details = err?.data?.details
      if (Array.isArray(details)) {
        const byField = {}
        for (const d of details) byField[d.path.replace('customer.', '')] = d.message
        setFieldErrors(byField)
      }
      // 409 (stock changed) -> refresh the quote so the summary shows the problem lines.
      if (err?.status === 409) refetch()
    }
  }

  return (
    <div className={`container page ${styles.page}`}>
      <h1 className="page-title">Checkout</h1>
      <div className={styles.layout}>
        <form className={styles.form} onSubmit={submit} noValidate={false}>
          <fieldset className={styles.fieldset}>
            <legend>Contact</legend>
            <Field label="Full name" error={fieldErrors.name}>
              <input className="input" value={form.name} onChange={update('name')} required minLength={2} autoComplete="name" />
            </Field>
            <div className={styles.row}>
              <Field label="Email" error={fieldErrors.email}>
                <input className="input" type="email" value={form.email} onChange={update('email')} required autoComplete="email" />
              </Field>
              <Field label="Mobile number" error={fieldErrors.phone} hint="10 digits, for delivery updates">
                <input
                  className="input"
                  type="tel"
                  inputMode="numeric"
                  value={form.phone}
                  onChange={update('phone')}
                  required
                  pattern="[6-9][0-9]{9}"
                  maxLength={10}
                  autoComplete="tel-national"
                />
              </Field>
            </div>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend>Delivery address</legend>
            <Field label="Address" error={fieldErrors.address} hint="House number, street, area">
              <textarea className="input" rows={2} value={form.address} onChange={update('address')} required minLength={5} autoComplete="street-address" />
            </Field>
            <div className={styles.row3}>
              <Field label="Pincode" error={fieldErrors.pincode ?? (deliveryError && errorMessage(deliveryError))}>
                <input
                  className="input"
                  inputMode="numeric"
                  value={form.pincode}
                  onChange={update('pincode')}
                  required
                  pattern="[1-9][0-9]{5}"
                  maxLength={6}
                  autoComplete="postal-code"
                />
              </Field>
              <Field label="City" error={fieldErrors.city}>
                <input className="input" value={form.city} onChange={update('city')} required autoComplete="address-level2" />
              </Field>
              <Field label="State" error={fieldErrors.state}>
                <select className="input" value={form.state} onChange={update('state')} required autoComplete="address-level1">
                  <option value="">Select</option>
                  {STATES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>
            {checkingDelivery && <p className={styles.deliveryNote}>Checking delivery…</p>}
            {deliveryOk && (
              <p className={styles.deliveryNote} data-ok={!codBlocked}>
                <Icon name="truck" size={16} /> Arrives by <strong>{formatDeliveryDate(delivery.estimatedDate)}</strong> ({delivery.region})
              </p>
            )}
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend>Payment</legend>
            <label className={styles.payment} data-disabled={codBlocked}>
              <input type="radio" name="payment" checked readOnly disabled={codBlocked} />
              <span>
                <strong>Cash on delivery</strong>
                <span>Pay in cash or UPI when your order arrives.</span>
              </span>
              <Icon name="cash" size={22} />
            </label>
            {codBlocked && <p className="field-error">Cash on delivery isn't available for {form.pincode}. Online payments are coming soon.</p>}
          </fieldset>

          {orderError && !orderError.data?.details?.length && (
            <p className={styles.error} role="alert">{errorMessage(orderError)}</p>
          )}
          {couponProblem && (
            <div className={styles.error} role="alert">
              <p>
                Code <strong>{couponProblem.code}</strong> can't be used: {couponProblem.reason}
              </p>
              <button type="button" className="link" onClick={() => dispatch(applyCoupon(null))}>
                Remove code
              </button>
            </div>
          )}
          {orderError?.status === 409 && hasProblems && (
            <button type="button" className="btn btn-outline" onClick={() => dispatch(reconcileWithQuote(quote))}>
              Update my bag to what's in stock
            </button>
          )}

          <button className="btn btn-primary btn-block" disabled={placing || hasProblems || Boolean(couponProblem) || codBlocked || !quote || isFetching}>
            {placing ? 'Placing your order…' : `Place order${totals ? ` · ${formatPrice(totals.totalCents)}` : ''}`}
          </button>
          <p className={styles.secure}>
            <Icon name="shield" size={16} /> Your details are only used to deliver this order.
          </p>
        </form>

        <OrderSummary totals={totals} loading={!quote && isFetching}>
          <ul className={styles.items}>
            {items.map((item) => (
              <li key={item.variantId}>
                <span className={styles.itemThumb}>
                  <img src={item.image} alt="" />
                  <span className={styles.qty}>{item.quantity}</span>
                </span>
                <span className={styles.itemInfo}>
                  <span>{item.name}</span>
                  <span className={styles.itemMeta}>
                    {item.color} / {item.size}
                  </span>
                  {problems.get(item.variantId) && <span className={styles.itemProblem}>{problems.get(item.variantId)}</span>}
                </span>
                <span className="tabular">{formatPrice(priceOf(item) * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <Link to="/cart" className="link" style={{ fontSize: 'var(--text-sm)' }}>
            Edit bag
          </Link>
        </OrderSummary>
      </div>
    </div>
  )
}

function Field({ label, error, hint, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {/* Mark the input invalid for screen readers and styling. */}
      {error ? cloneElement(children, { 'aria-invalid': true }) : children}
      {error ? <span className="field-error">{error}</span> : hint && <span className={styles.hint}>{hint}</span>}
    </label>
  )
}
