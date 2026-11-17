import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { useSuggestQuery } from '../../store/apiSlice.js'
import { useDebouncedValue, useEscapeKey, useScrollLock } from '../../lib/hooks.js'
import Price from '../product/Price.jsx'
import Icon from '../ui/Icon.jsx'
import styles from './SearchOverlay.module.css'

const TRENDING = ['Linen shirts', 'Oversized tees', 'Baggy jeans', 'Hoodies', 'Chinos', 'Polos']
const PLACEHOLDERS = ['Try "linen shirt"', 'Try "baggy jeans"', 'Try "hoodie"', 'Try "polo"']

export default function SearchOverlay({ open, onClose }) {
  const [term, setTerm] = useState('')
  const [placeholder, setPlaceholder] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()
  useScrollLock(open)
  useEscapeKey(open, onClose)

  // Debounce: wait until typing pauses for 200ms before asking the API, so
  // typing "linen" sends 1 request instead of 5.
  const debounced = useDebouncedValue(term.trim(), 200)
  const { data, isFetching } = useSuggestQuery(debounced, { skip: debounced.length < 2 })

  useEffect(() => {
    if (open) {
      setTerm('')
      // Wait for the opening transition to start before focusing.
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  // Animated placeholder hints (Veirdo style).
  useEffect(() => {
    if (!open) return
    const timer = setInterval(() => setPlaceholder((i) => (i + 1) % PLACEHOLDERS.length), 2500)
    return () => clearInterval(timer)
  }, [open])

  function submit(query) {
    const q = query.trim()
    if (!q) return
    onClose()
    navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  const showResults = debounced.length >= 2 && data
  const hasResults = showResults && (data.products.length > 0 || data.categories.length > 0)

  return createPortal(
    <div className={styles.root} data-open={open} inert={open ? undefined : ''} role="dialog" aria-modal="true" aria-label="Search">
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div className={styles.panel}>
        <div className="container">
          <form
            className={styles.form}
            role="search"
            onSubmit={(event) => {
              event.preventDefault()
              submit(term)
            }}
          >
            <Icon name="search" size={22} />
            <input
              ref={inputRef}
              className={styles.input}
              type="search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder={PLACEHOLDERS[placeholder]}
              aria-label="Search products"
              autoComplete="off"
              enterKeyHint="search"
            />
            {isFetching && <span className={styles.spinner} aria-label="Searching" />}
            <button type="button" className={styles.close} onClick={onClose} aria-label="Close search">
              <Icon name="close" />
            </button>
          </form>

          <div className={styles.results}>
            {!showResults && (
              <div>
                <p className="eyebrow">Trending searches</p>
                <ul className={styles.chips}>
                  {TRENDING.map((t) => (
                    <li key={t}>
                      <button className={styles.chip} onClick={() => submit(t)}>
                        {t}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {showResults && !hasResults && (
              <p className={styles.none}>
                No matches for "{debounced}". Try a different word, like "shirt" or "denim".
              </p>
            )}

            {hasResults && (
              <div className={styles.grid}>
                {data.categories.length > 0 && (
                  <div>
                    <p className="eyebrow">Categories</p>
                    <ul className={styles.categoryList}>
                      {data.categories.map((c) => (
                        <li key={c.slug}>
                          <Link to={`/c/${c.slug}`} onClick={onClose}>
                            {c.name}
                            {c.parent_name && <span> in {c.parent_name}</span>}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <p className="eyebrow">Products</p>
                  <ul className={styles.productList}>
                    {data.products.map((p) => (
                      <li key={p.id}>
                        <Link to={`/products/${p.slug}`} onClick={onClose} className={styles.product}>
                          <img src={p.images[0]} alt="" />
                          <span>
                            <span className={styles.productName}>{p.name}</span>
                            <Price priceCents={p.price_cents} compareAtCents={p.compare_at_price_cents} size="sm" />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <button className="btn btn-outline btn-sm" onClick={() => submit(term)}>
                    See all results for "{term.trim()}"
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
