import Icon from './Icon.jsx'
import styles from './QuantityStepper.module.css'

/** − 2 + control. Disables at the limits instead of silently clamping. */
export default function QuantityStepper({ value, min = 1, max = 10, onChange, label }) {
  return (
    <div className={styles.stepper} role="group" aria-label={`Quantity for ${label}`}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Decrease quantity">
        <Icon name="minus" size={14} />
      </button>
      <span className={styles.value} aria-live="polite">
        {value}
      </span>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity">
        <Icon name="plus" size={14} />
      </button>
    </div>
  )
}
