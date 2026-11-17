import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useGetCategoriesQuery, useGetCollectionsQuery, useGetCouponsQuery, useGetProductsQuery } from '../../store/apiSlice.js'
import { selectRecentIds } from '../../store/recentSlice.js'
import { copyToClipboard } from '../../lib/hooks.js'
import { formatPrice } from '../../lib/format.js'
import { PROMISES } from '../layout/Footer.jsx'
import ProductCarousel from '../product/ProductCarousel.jsx'
import Icon from '../ui/Icon.jsx'
import { Skeleton } from '../ui/Feedback.jsx'
import styles from './HomeSections.module.css'

export function PromiseStrip() {
  return (
    <ul className={`container ${styles.promises}`}>
      {PROMISES.map((p) => (
        <li key={p.title}>
          <Icon name={p.icon} size={22} strokeWidth={1.5} />
          <span>
            <strong>{p.title}</strong>
            <span>{p.text}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

export function CategoryTiles() {
  const { data: categories, isLoading } = useGetCategoriesQuery()
  return (
    <section className={`container ${styles.section}`}>
      <header className={styles.header}>
        <h2 className={styles.title}>Shop by category</h2>
      </header>
      <ul className={styles.categoryGrid}>
        {isLoading
          ? Array.from({ length: 4 }, (_, i) => (
              <li key={i}>
                <Skeleton height="auto" style={{ aspectRatio: '3 / 4' }} radius="var(--radius-lg)" />
              </li>
            ))
          : categories.map((c) => (
              <li key={c.slug}>
                <Link to={`/c/${c.slug}`} className={styles.categoryTile}>
                  <img src={c.image_url} alt="" loading="lazy" />
                  <span className={styles.categoryLabel}>
                    <span>{c.name}</span>
                    <span className={styles.categoryCount}>{c.product_count} styles</span>
                  </span>
                </Link>
              </li>
            ))}
      </ul>
    </section>
  )
}

/**
 * Tabs swap the category filter. Each tab is its own RTK Query cache entry,
 * so switching back to a tab you already opened is instant (no request).
 */
export function TabbedBestsellers() {
  const { data: categories = [] } = useGetCategoriesQuery()
  const [active, setActive] = useState('')
  const { data, isFetching } = useGetProductsQuery({ sort: 'popular', limit: 10, category: active || undefined })

  const tabs = [{ slug: '', name: 'All' }, ...categories]
  return (
    <div className="container">
      <ProductCarousel
        eyebrow="Most loved"
        title="Bestsellers"
        products={data?.items}
        loading={isFetching && !data}
        viewAllTo={`/shop?sort=popular${active ? `&category=${active}` : ''}`}
        tabs={
          <div className={styles.tabs} role="tablist" aria-label="Bestseller categories">
            {tabs.map((tab) => (
              <button
                key={tab.slug}
                role="tab"
                aria-selected={active === tab.slug}
                className={styles.tab}
                onClick={() => setActive(tab.slug)}
              >
                {tab.name}
              </button>
            ))}
          </div>
        }
      />
    </div>
  )
}

export function CollectionTiles() {
  const { data: collections = [] } = useGetCollectionsQuery()
  if (!collections.length) return null
  return (
    <section className={`container ${styles.section}`}>
      <header className={styles.header}>
        <div>
          <p className="eyebrow">Match the mood</p>
          <h2 className={styles.title}>Shop by occasion</h2>
        </div>
      </header>
      <ul className={styles.collectionGrid}>
        {collections.map((c, i) => (
          <li key={c.slug} className={i === 0 ? styles.featured : undefined}>
            <Link to={`/collections/${c.slug}`} className={styles.collectionTile}>
              <img src={c.image_url} alt="" loading="lazy" />
              <span className={styles.collectionCopy}>
                <span className={styles.collectionName}>{c.name}</span>
                <span className={styles.collectionTagline}>{c.tagline}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Big-type offer banner. Uses the highest-value live coupon, with copy-to-clipboard. */
export function OfferBanner() {
  const { data: coupons = [] } = useGetCouponsQuery()
  const [copied, setCopied] = useState(false)
  const coupon = coupons.find((c) => c.discount_type === 'flat') ?? coupons[0]
  if (!coupon) return null

  async function copy() {
    if (await copyToClipboard(coupon.code)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const headline =
    coupon.discount_type === 'flat' ? `${formatPrice(coupon.discount_value)} off` : `${coupon.discount_value}% off`

  return (
    <section className="container">
      <div className={styles.offer}>
        <p className={styles.offerEyebrow}>Limited time</p>
        <p className={styles.offerHeadline}>{headline}</p>
        <p className={styles.offerText}>{coupon.description}</p>
        <button className={styles.code} onClick={copy}>
          <span>{coupon.code}</span>
          <Icon name={copied ? 'check' : 'copy'} size={16} />
          <span className="visually-hidden" aria-live="polite">
            {copied ? 'Copied' : ''}
          </span>
        </button>
      </div>
    </section>
  )
}

export function NewArrivals() {
  const { data, isLoading } = useGetProductsQuery({ sort: 'newest', limit: 10 })
  return (
    <div className="container">
      <ProductCarousel eyebrow="Just landed" title="New arrivals" products={data?.items} loading={isLoading} viewAllTo="/shop?sort=newest" />
    </div>
  )
}

/** Products this shopper opened before. IDs come from Redux; fresh card data from the API. */
export function RecentlyViewed({ excludeId, title = 'Recently viewed' }) {
  const ids = useSelector(selectRecentIds).filter((id) => id !== excludeId)
  const { data } = useGetProductsQuery({ ids, limit: 12 }, { skip: ids.length === 0 })
  if (!ids.length || !data?.items.length) return null

  // The API returns them in catalogue order; put them back in viewing order.
  const order = new Map(ids.map((id, i) => [id, i]))
  const products = [...data.items].sort((a, b) => order.get(a.id) - order.get(b.id))
  return <ProductCarousel title={title} products={products} />
}
