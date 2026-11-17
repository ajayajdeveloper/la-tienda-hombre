import { PRICE_BUCKETS, activeBucket, toggleInList } from '../../lib/filters.js'
import Icon from '../ui/Icon.jsx'
import styles from './FilterPanel.module.css'

/**
 * Presentational: receives the current filters + facet counts, and reports
 * changes through `onChange`. It knows nothing about URLs or the API, so the
 * same component renders in the desktop sidebar and the mobile drawer.
 */
export default function FilterPanel({ filters, facets, onChange }) {
  // Keep a selected value visible even if its count drops to 0, so it can
  // still be unselected.
  const sizes = withSelected(facets?.sizes ?? [], filters.sizes)
  const colors = withSelected(facets?.colors ?? [], filters.colors)
  const bucket = activeBucket(filters)

  return (
    <div className={styles.panel}>
      <FilterGroup title="Size" count={filters.sizes.length}>
        <div className={styles.sizes}>
          {sizes.map((s) => (
            <button
              key={s.value}
              type="button"
              className={styles.size}
              aria-pressed={filters.sizes.includes(s.value)}
              onClick={() => onChange({ sizes: toggleInList(filters.sizes, s.value) })}
            >
              {s.value}
              <span className={styles.facetCount}>{s.count}</span>
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Colour" count={filters.colors.length}>
        <ul className={styles.colors}>
          {colors.map((c) => (
            <li key={c.value}>
              <label className={styles.colorRow}>
                <input
                  type="checkbox"
                  checked={filters.colors.includes(c.value)}
                  onChange={() => onChange({ colors: toggleInList(filters.colors, c.value) })}
                />
                <span className={styles.swatch} style={{ background: c.hex }}>
                  <Icon name="check" size={12} strokeWidth={3} />
                </span>
                <span className={styles.colorName}>{c.value}</span>
                <span className={styles.facetCount}>{c.count}</span>
              </label>
            </li>
          ))}
        </ul>
      </FilterGroup>

      <FilterGroup title="Price" count={bucket || filters.minPrice != null || filters.maxPrice != null ? 1 : 0}>
        <ul className={styles.options}>
          {PRICE_BUCKETS.map((b) => (
            <li key={b.key}>
              <label className={styles.option}>
                <input
                  type="radio"
                  name="price"
                  checked={bucket?.key === b.key}
                  onChange={() => onChange({ minPrice: b.min, maxPrice: b.max })}
                />
                {b.label}
              </label>
            </li>
          ))}
        </ul>
      </FilterGroup>

      <FilterGroup title="Offers" count={filters.onSale ? 1 : 0}>
        <label className={styles.option}>
          <input type="checkbox" checked={filters.onSale} onChange={(e) => onChange({ onSale: e.target.checked })} />
          On sale
        </label>
      </FilterGroup>
    </div>
  )
}

function FilterGroup({ title, count, children }) {
  return (
    <details className={styles.group} open>
      <summary className={styles.groupTitle}>
        <span>
          {title}
          {count > 0 && <span className={styles.groupCount}>{count}</span>}
        </span>
        <Icon name="chevronDown" size={16} className={styles.chevron} />
      </summary>
      <div className={styles.groupBody}>{children}</div>
    </details>
  )
}

function withSelected(facetValues, selected) {
  const present = new Set(facetValues.map((f) => f.value))
  return [...facetValues, ...selected.filter((s) => !present.has(s)).map((value) => ({ value, count: 0 }))]
}
