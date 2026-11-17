import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useGetCouponsQuery } from '../../store/apiSlice.js'
import { showToast } from '../../store/uiSlice.js'
import { copyToClipboard } from '../../lib/hooks.js'
import { formatPrice } from '../../lib/format.js'
import Icon from '../ui/Icon.jsx'
import styles from './OfferCards.module.css'

/**
 * Coupon cards with copy-code. `onApply` (cart page) applies the code
 * directly; on the product page the code is copied instead.
 */
export default function OfferCards({ onApply, appliedCode }) {
  const { data: coupons = [] } = useGetCouponsQuery()
  const dispatch = useDispatch()
  const [copied, setCopied] = useState(null)

  if (!coupons.length) return null

  async function handle(code) {
    if (onApply) return onApply(code)
    if (await copyToClipboard(code)) {
      setCopied(code)
      dispatch(showToast(`Code ${code} copied`))
      setTimeout(() => setCopied(null), 2000)
    }
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.title}>
        <Icon name="tag" size={18} /> Offers for you
      </p>
      <ul className={styles.cards}>
        {coupons.map((c) => (
          <li key={c.code} className={styles.card} data-applied={appliedCode === c.code}>
            <p className={styles.headline}>
              {c.discount_type === 'flat' ? `${formatPrice(c.discount_value)} off` : `${c.discount_value}% off`}
            </p>
            <p className={styles.description}>{c.description}</p>
            <button className={styles.code} onClick={() => handle(c.code)} disabled={appliedCode === c.code}>
              <span>{c.code}</span>
              {onApply ? (
                <strong>{appliedCode === c.code ? 'Applied' : 'Apply'}</strong>
              ) : (
                <Icon name={copied === c.code ? 'check' : 'copy'} size={14} />
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
