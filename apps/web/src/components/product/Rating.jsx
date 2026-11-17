import Icon from '../ui/Icon.jsx'
import styles from './Rating.module.css'

/** Compact "4.6 ★ | 12" chip used on cards and next to the product title. */
export default function Rating({ average, count, variant = 'chip' }) {
  if (!count) return null
  return (
    <span className={styles[variant]} aria-label={`Rated ${average} out of 5 from ${count} reviews`}>
      <span aria-hidden="true">{Number(average).toFixed(1)}</span>
      <Icon name="star" size={12} filled className={styles.star} />
      <span className={styles.count} aria-hidden="true">
        {count}
      </span>
    </span>
  )
}

/** Five stars, filled to the rating, for the reviews section. */
export function Stars({ value, size = 16 }) {
  return (
    <span className={styles.stars} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon key={n} name="star" size={size} filled={n <= Math.round(value)} className={n <= Math.round(value) ? styles.on : styles.off} />
      ))}
    </span>
  )
}
