import { useState } from 'react'
import Modal from '../ui/Modal.jsx'
import Icon from '../ui/Icon.jsx'
import styles from './SizeSelector.module.css'

const LOW_STOCK = 5

/**
 * Size buttons for the selected colour. Sold-out sizes stay visible (crossed
 * out) and are still clickable: picking one switches the main button to
 * "Notify me", which is more useful than hiding the size.
 */
export default function SizeSelector({ variants, selectedId, onSelect, kind }) {
  const [guideOpen, setGuideOpen] = useState(false)
  const selected = variants.find((v) => v.id === selectedId)

  return (
    <div className={styles.wrap}>
      <div className={styles.labelRow}>
        <p className={styles.label}>
          Size{selected && <span>: {selected.size}</span>}
        </p>
        <button className={`${styles.guideButton} link`} onClick={() => setGuideOpen(true)}>
          <Icon name="ruler" size={16} /> Size guide
        </button>
      </div>

      <div className={styles.sizes} role="radiogroup" aria-label="Choose a size">
        {variants.map((v) => {
          const soldOut = v.stock_quantity === 0
          const low = !soldOut && v.stock_quantity <= LOW_STOCK
          return (
            <button
              key={v.id}
              role="radio"
              aria-checked={v.id === selectedId}
              className={styles.size}
              data-soldout={soldOut}
              onClick={() => onSelect(v.id)}
              aria-label={`${v.size}${soldOut ? ', sold out' : low ? `, only ${v.stock_quantity} left` : ''}`}
            >
              {v.size}
              {low && <span className={styles.low}>{v.stock_quantity} left</span>}
            </button>
          )
        })}
      </div>

      <SizeGuide open={guideOpen} onClose={() => setGuideOpen(false)} kind={kind} />
    </div>
  )
}

// Body measurements in inches. Bottoms use waist sizes.
const GUIDES = {
  tops: {
    columns: ['Size', 'Chest', 'Length', 'Shoulder'],
    rows: [
      ['S', 38, 27.5, 17],
      ['M', 40, 28, 17.5],
      ['L', 42, 29, 18.25],
      ['XL', 44, 29.5, 19],
      ['XXL', 46, 30, 19.75],
    ],
  },
  bottoms: {
    columns: ['Size', 'Waist', 'Hip', 'Inseam'],
    rows: [
      ['28', 28, 36, 30],
      ['30', 30, 38, 30.5],
      ['32', 32, 40, 31],
      ['34', 34, 42, 31.5],
      ['36', 36, 44, 32],
    ],
  },
}

export function SizeGuide({ open, onClose, kind = 'tops' }) {
  const [unit, setUnit] = useState('in')
  const guide = GUIDES[kind] ?? GUIDES.tops
  const convert = (inches) => (unit === 'in' ? inches : Math.round(inches * 2.54))

  return (
    <Modal open={open} onClose={onClose} title="Size guide">
      <div className={styles.unitToggle} role="group" aria-label="Units">
        {['in', 'cm'].map((u) => (
          <button key={u} aria-pressed={unit === u} onClick={() => setUnit(u)}>
            {u === 'in' ? 'Inches' : 'Centimetres'}
          </button>
        ))}
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            {guide.columns.map((c) => (
              <th key={c} scope="col">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {guide.rows.map(([size, ...values]) => (
            <tr key={size}>
              <th scope="row">{size}</th>
              {values.map((v, i) => (
                <td key={i}>{convert(v)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.tip}>
        Measurements are of the body, not the garment. Between sizes? Size up for a relaxed fit, down for a slim one.
      </p>
    </Modal>
  )
}
