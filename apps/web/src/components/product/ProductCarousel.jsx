import { useRef } from 'react'
import { Link } from 'react-router-dom'
import ProductCard, { ProductCardSkeleton } from './ProductCard.jsx'
import Icon from '../ui/Icon.jsx'
import styles from './ProductCarousel.module.css'

/**
 * Horizontal row of cards. Scrolling is native (CSS scroll-snap), so touch
 * swipe, trackpad and keyboard all work; the arrow buttons just call scrollBy.
 */
export default function ProductCarousel({ title, eyebrow, products, loading, viewAllTo, viewAllLabel = 'View all', tabs }) {
  const trackRef = useRef(null)

  function scroll(direction) {
    const track = trackRef.current
    track?.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: 'smooth' })
  }

  if (!loading && !products?.length) return null

  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2 className={styles.title}>{title}</h2>
        </div>
        <div className={styles.controls}>
          {viewAllTo && (
            <Link to={viewAllTo} className={styles.viewAll}>
              {viewAllLabel} <Icon name="arrowRight" size={16} />
            </Link>
          )}
          <button className={styles.arrow} onClick={() => scroll(-1)} aria-label="Scroll left">
            <Icon name="chevronLeft" size={18} />
          </button>
          <button className={styles.arrow} onClick={() => scroll(1)} aria-label="Scroll right">
            <Icon name="chevronRight" size={18} />
          </button>
        </div>
      </header>
      {tabs}
      <div ref={trackRef} className={styles.track}>
        {loading
          ? Array.from({ length: 5 }, (_, i) => (
              <div key={i} className={styles.slide}>
                <ProductCardSkeleton />
              </div>
            ))
          : products.map((product) => (
              <div key={product.id} className={styles.slide}>
                <ProductCard product={product} />
              </div>
            ))}
      </div>
    </section>
  )
}
