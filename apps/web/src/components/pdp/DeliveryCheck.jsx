import { useEffect, useState } from 'react'
import { errorMessage, useLazyCheckDeliveryQuery } from '../../store/apiSlice.js'
import { formatDeliveryDate } from '../../lib/format.js'
import { useStoredState } from '../../lib/hooks.js'
import Icon from '../ui/Icon.jsx'
import styles from './DeliveryCheck.module.css'

/**
 * Pincode check. A *lazy* query: nothing is fetched until the shopper asks.
 * The last pincode is remembered on this device, so the next product page
 * shows the estimate straight away.
 */
export default function DeliveryCheck() {
  const [saved, setSaved] = useStoredState('lth:pincode', '')
  const [pincode, setPincode] = useState(saved)
  const [check, { data, error, isFetching }] = useLazyCheckDeliveryQuery()

  useEffect(() => {
    if (saved) check(saved, true) // `true` = reuse a cached answer if there is one
  }, [saved, check])

  function submit(event) {
    event.preventDefault()
    if (/^[1-9][0-9]{5}$/.test(pincode)) {
      setSaved(pincode)
      check(pincode, true)
    }
  }

  const valid = /^[1-9][0-9]{5}$/.test(pincode)

  return (
    <div className={styles.box}>
      <p className={styles.title}>
        <Icon name="pin" size={18} /> Check delivery
      </p>
      <form className={styles.form} onSubmit={submit}>
        <input
          className="input"
          inputMode="numeric"
          maxLength={6}
          placeholder="Enter pincode"
          value={pincode}
          onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
          aria-label="Pincode"
        />
        <button className="btn btn-outline btn-sm" disabled={!valid || isFetching}>
          {isFetching ? 'Checking…' : 'Check'}
        </button>
      </form>
      {data && !error && data.pincode === saved && (
        <ul className={styles.result}>
          <li>
            <Icon name="truck" size={16} /> Delivery by <strong>{formatDeliveryDate(data.estimatedDate)}</strong> to {data.region}
          </li>
          <li data-ok={data.codAvailable}>
            <Icon name={data.codAvailable ? 'cash' : 'close'} size={16} />
            {data.codAvailable ? 'Cash on delivery available' : 'Cash on delivery not available here'}
          </li>
          <li>
            <Icon name="returns" size={16} /> 15-day easy returns and exchanges
          </li>
        </ul>
      )}
      {error && <p className={styles.error}>{errorMessage(error)}</p>}
    </div>
  )
}
