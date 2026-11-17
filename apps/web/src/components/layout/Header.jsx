import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useGetCategoriesQuery, useGetCollectionsQuery } from '../../store/apiSlice.js'
import { selectCartCount } from '../../store/cartSelectors.js'
import { selectWishlistIds } from '../../store/wishlistSlice.js'
import { openOverlay } from '../../store/uiSlice.js'
import Icon from '../ui/Icon.jsx'
import styles from './Header.module.css'

export default function Header() {
  const dispatch = useDispatch()
  const cartCount = useSelector(selectCartCount)
  const wishlistCount = useSelector(selectWishlistIds).length
  const { data: categories = [] } = useGetCategoriesQuery()
  const { data: collections = [] } = useGetCollectionsQuery()
  const [openMenu, setOpenMenu] = useState(null)
  const location = useLocation()

  // Close the mega menu after navigating. Comparing during render (instead of
  // in an effect) avoids one frame where the old menu is still showing.
  const [lastPath, setLastPath] = useState(location.pathname)
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname)
    setOpenMenu(null)
  }

  return (
    <header className={styles.header} onMouseLeave={() => setOpenMenu(null)}>
      <div className={`container ${styles.inner}`}>
        <button className={`${styles.iconButton} ${styles.menuButton}`} onClick={() => dispatch(openOverlay('menu'))} aria-label="Open menu">
          <Icon name="menu" size={22} />
        </button>

        <Link to="/" className={styles.logo} aria-label="La Tienda Hombre home">
          <span className={styles.logoMark}>La Tienda</span>
          <span className={styles.logoSub}>Hombre</span>
        </Link>

        <nav className={styles.nav} aria-label="Main">
          <NavLink to="/shop?sort=newest" className={styles.navLink} onMouseEnter={() => setOpenMenu(null)}>
            New In
          </NavLink>
          {categories.map((category) => (
            <div
              key={category.slug}
              className={styles.navItem}
              onMouseEnter={() => setOpenMenu(category.slug)}
              onFocus={() => setOpenMenu(category.slug)}
            >
              <NavLink to={`/c/${category.slug}`} className={styles.navLink} aria-expanded={openMenu === category.slug}>
                {category.name}
              </NavLink>
            </div>
          ))}
          <NavLink to="/shop?onSale=true" className={`${styles.navLink} ${styles.sale}`} onMouseEnter={() => setOpenMenu(null)}>
            Sale
          </NavLink>
        </nav>

        <div className={styles.actions}>
          <button className={styles.iconButton} onClick={() => dispatch(openOverlay('search'))} aria-label="Search">
            <Icon name="search" size={21} />
          </button>
          <Link to="/wishlist" className={styles.iconButton} aria-label={`Wishlist, ${wishlistCount} items`}>
            <Icon name="heart" size={21} />
            {wishlistCount > 0 && <span className={styles.count}>{wishlistCount}</span>}
          </Link>
          <button className={styles.iconButton} onClick={() => dispatch(openOverlay('cart'))} aria-label={`Cart, ${cartCount} items`}>
            <Icon name="bag" size={21} />
            {cartCount > 0 && <span className={styles.count}>{cartCount}</span>}
          </button>
        </div>
      </div>

      {categories.map((category) => (
        <MegaMenu
          key={category.slug}
          category={category}
          collections={collections}
          open={openMenu === category.slug}
          onClose={() => setOpenMenu(null)}
        />
      ))}
    </header>
  )
}

function MegaMenu({ category, collections, open, onClose }) {
  return (
    <div className={styles.mega} data-open={open} inert={open ? undefined : ''}>
      <div className={`container ${styles.megaInner}`}>
        <div className={styles.megaLinks}>
          <p className="eyebrow">{category.name}</p>
          <Link to={`/c/${category.slug}`} className={styles.megaAll} onClick={onClose}>
            Shop all {category.name.toLowerCase()} <span>({category.product_count})</span>
          </Link>
          <ul>
            {category.children.map((child) => (
              <li key={child.slug}>
                <Link to={`/c/${child.slug}`} onClick={onClose}>
                  {child.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <ul className={styles.megaTiles}>
          {category.children.slice(0, 4).map((child) => (
            <li key={child.slug}>
              <Link to={`/c/${child.slug}`} className={styles.megaTile} onClick={onClose}>
                <img src={child.image_url} alt="" loading="lazy" />
                <span>{child.name}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className={styles.megaCollections}>
          <p className="eyebrow">Shop by occasion</p>
          <ul>
            {collections.map((c) => (
              <li key={c.slug}>
                <Link to={`/collections/${c.slug}`} onClick={onClose}>
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
