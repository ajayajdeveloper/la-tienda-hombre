import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useGetCouponsQuery, useGetSettingsQuery } from '../../store/apiSlice.js'
import { formatPrice } from '../../lib/format.js'
import Icon from '../ui/Icon.jsx'
import styles from './PromoBar.module.css'

const ROTATE_MS = 4500

/**
 * One offer at a time, with arrows (Veirdo style) rather than a marquee:
 * a marquee is hard to read and can't be paused by keyboard users.
 * Messages come from live data (settings + coupons), never hard-coded copy
 * that could go stale.
 */
export default function PromoBar() {
  const { data: settings } = useGetSettingsQuery()
  const { data: coupons = [] } = useGetCouponsQuery()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const messages = [
    settings && { text: `Free shipping on orders above ${formatPrice(settings.freeShippingThresholdCents)}`, to: '/shop' },
    ...coupons.map((c) => ({ text: `${c.description} | Use code ${c.code}`, to: '/shop' })),
    { text: 'Cash on delivery available across India', to: '/help#shipping' },
  ].filter(Boolean)

  useEffect(() => {
    if (paused || messages.length < 2) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % messages.length), ROTATE_MS)
    return () => clearInterval(timer)
  }, [paused, messages.length])

  const current = messages[index % messages.length]
  const step = (delta) => setIndex((i) => (i + delta + messages.length) % messages.length)

  return (
    <div
      className={styles.bar}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <button className={styles.arrow} onClick={() => step(-1)} aria-label="Previous offer">
        <Icon name="chevronLeft" size={14} />
      </button>
      <Link key={index} to={current.to} className={styles.message} aria-live="polite">
        {current.text}
      </Link>
      <button className={styles.arrow} onClick={() => step(1)} aria-label="Next offer">
        <Icon name="chevronRight" size={14} />
      </button>
    </div>
  )
}
