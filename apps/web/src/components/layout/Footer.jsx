import { Link } from 'react-router-dom'
import { useGetCategoriesQuery, useGetCollectionsQuery } from '../../store/apiSlice.js'
import Icon from '../ui/Icon.jsx'
import styles from './Footer.module.css'

export const PROMISES = [
  { icon: 'truck', title: 'Free shipping', text: 'On orders above ₹999' },
  { icon: 'cash', title: 'Cash on delivery', text: 'Pay when it arrives' },
  { icon: 'returns', title: '15-day returns', text: 'Easy exchanges' },
  { icon: 'shield', title: 'Secure checkout', text: 'Your data stays private' },
]

export default function Footer() {
  const { data: categories = [] } = useGetCategoriesQuery()
  const { data: collections = [] } = useGetCollectionsQuery()

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.promises}`}>
        {PROMISES.map((p) => (
          <div key={p.title} className={styles.promise}>
            <Icon name={p.icon} size={26} strokeWidth={1.4} />
            <div>
              <p className={styles.promiseTitle}>{p.title}</p>
              <p className={styles.promiseText}>{p.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className={`container ${styles.columns}`}>
        <div className={styles.brand}>
          <p className={styles.logo}>La Tienda Hombre</p>
          <p className={styles.tagline}>
            Menswear built to last. Designed in Bengaluru, shipped across India.
          </p>
        </div>

        <FooterColumn title="Shop">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link to={`/c/${c.slug}`}>{c.name}</Link>
            </li>
          ))}
          <li>
            <Link to="/shop?onSale=true">Sale</Link>
          </li>
        </FooterColumn>

        <FooterColumn title="Occasions">
          {collections.map((c) => (
            <li key={c.slug}>
              <Link to={`/collections/${c.slug}`}>{c.name}</Link>
            </li>
          ))}
        </FooterColumn>

        <FooterColumn title="Help">
          <li>
            <Link to="/help#shipping">Shipping and delivery</Link>
          </li>
          <li>
            <Link to="/help#returns">Returns and exchanges</Link>
          </li>
          <li>
            <Link to="/help#sizing">Size guide</Link>
          </li>
          <li>
            <Link to="/help#faq">FAQ</Link>
          </li>
        </FooterColumn>
      </div>

      <div className={`container ${styles.bottom}`}>
        <p>© {new Date().getFullYear()} La Tienda Hombre. A learning project, not a real store.</p>
        <p>Prices in INR, inclusive of all taxes.</p>
      </div>
    </footer>
  )
}

/** A link column: always open on desktop, a collapsible accordion on mobile. */
function FooterColumn({ title, children }) {
  return (
    <details className={styles.column} open>
      <summary className={styles.columnTitle}>
        {title}
        <Icon name="chevronDown" size={16} className={styles.chevron} />
      </summary>
      <ul>{children}</ul>
    </details>
  )
}
