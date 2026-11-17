import { Link } from 'react-router-dom'
import { useGetCategoriesQuery, useGetCollectionsQuery } from '../../store/apiSlice.js'
import Drawer from '../ui/Drawer.jsx'
import Icon from '../ui/Icon.jsx'
import styles from './MobileNav.module.css'

/** Off-canvas menu with the full category tree as accordions (native <details>). */
export default function MobileNav({ open, onClose }) {
  const { data: categories = [] } = useGetCategoriesQuery()
  const { data: collections = [] } = useGetCollectionsQuery()

  return (
    <Drawer open={open} onClose={onClose} side="left" title="Menu" width={360}>
      <nav className={styles.nav} aria-label="Mobile">
        <Link to="/shop?sort=newest" className={styles.top} onClick={onClose}>
          New In
        </Link>
        {categories.map((category) => (
          <details key={category.slug} className={styles.group}>
            <summary className={styles.top}>
              {category.name}
              <Icon name="chevronDown" size={18} className={styles.chevron} />
            </summary>
            <ul className={styles.children}>
              <li>
                <Link to={`/c/${category.slug}`} onClick={onClose}>
                  Shop all {category.name}
                </Link>
              </li>
              {category.children.map((child) => (
                <li key={child.slug}>
                  <Link to={`/c/${child.slug}`} onClick={onClose}>
                    {child.name}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        ))}
        <Link to="/shop?onSale=true" className={`${styles.top} ${styles.sale}`} onClick={onClose}>
          Sale
        </Link>

        <p className={`eyebrow ${styles.heading}`}>Shop by occasion</p>
        <ul className={styles.collections}>
          {collections.map((c) => (
            <li key={c.slug}>
              <Link to={`/collections/${c.slug}`} onClick={onClose}>
                <img src={c.image_url} alt="" loading="lazy" />
                <span>{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className={styles.footerLinks}>
          <Link to="/wishlist" onClick={onClose}>
            <Icon name="heart" size={18} /> Wishlist
          </Link>
          <Link to="/help#shipping" onClick={onClose}>
            <Icon name="truck" size={18} /> Shipping
          </Link>
          <Link to="/help#returns" onClick={onClose}>
            <Icon name="returns" size={18} /> Returns and exchanges
          </Link>
        </div>
      </nav>
    </Drawer>
  )
}
