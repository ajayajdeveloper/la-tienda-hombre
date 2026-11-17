import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { errorMessage, useGetProductQuery, useGetSimilarQuery, useNotifyMeMutation } from '../store/apiSlice.js'
import { addItem } from '../store/cartSlice.js'
import { viewedProduct } from '../store/recentSlice.js'
import { showToast } from '../store/uiSlice.js'
import { useDocumentTitle } from '../lib/hooks.js'
import Gallery from '../components/pdp/Gallery.jsx'
import SizeSelector from '../components/pdp/SizeSelector.jsx'
import DeliveryCheck from '../components/pdp/DeliveryCheck.jsx'
import OfferCards from '../components/pdp/OfferCards.jsx'
import Reviews from '../components/pdp/Reviews.jsx'
import Price from '../components/product/Price.jsx'
import Rating from '../components/product/Rating.jsx'
import WishlistButton from '../components/product/WishlistButton.jsx'
import ProductCarousel from '../components/product/ProductCarousel.jsx'
import { RecentlyViewed } from '../components/home/HomeSections.jsx'
import Accordion from '../components/ui/Accordion.jsx'
import Icon from '../components/ui/Icon.jsx'
import { EmptyState, ErrorMessage, Skeleton } from '../components/ui/Feedback.jsx'
import styles from './ProductDetail.module.css'

const BADGE_LABEL = { new: 'New arrival', bestseller: 'Bestseller', limited: 'Limited edition' }

export default function ProductDetail() {
  const { slug } = useParams()
  // currentData (not data): while product B loads, `data` still holds product A.
  // Rendering it would show A's purchase panel under B's URL, and A could be
  // added to the bag. currentData is undefined until B's own response arrives.
  const { currentData: product, error, isFetching, refetch } = useGetProductQuery(slug)
  const { currentData: similar, isFetching: similarLoading } = useGetSimilarQuery(slug)
  const dispatch = useDispatch()

  useDocumentTitle(product?.name)

  // Record the view once the product has loaded (feeds "Recently viewed").
  useEffect(() => {
    if (product) dispatch(viewedProduct(product.id))
  }, [product, dispatch])

  if (!product && !error) return <ProductSkeleton />
  if (error?.status === 404) {
    return (
      <div className="container page">
        <EmptyState icon="search" title="We couldn't find that product" action={<Link to="/shop" className="btn btn-primary">Browse the shop</Link>}>
          It may have sold out for good or moved.
        </EmptyState>
      </div>
    )
  }
  if (error) {
    return (
      <div className="container page">
        <ErrorMessage onRetry={refetch}>{errorMessage(error)}</ErrorMessage>
      </div>
    )
  }

  return (
    <div className={`container page ${styles.page}`}>
      {/* key={slug}: moving to a "similar" product resets all purchase state. */}
      <ProductMain key={product.slug} product={product} />
      <Reviews slug={slug} />
      <ProductCarousel title="You may also like" products={similar} loading={similarLoading} />
      <RecentlyViewed excludeId={product.id} />
    </div>
  )
}

function ProductMain({ product }) {
  const dispatch = useDispatch()
  const [searchParams, setSearchParams] = useSearchParams()

  // Colours in display order, from the variant list.
  const colors = useMemo(() => {
    const seen = new Map()
    for (const v of product.variants) if (!seen.has(v.color)) seen.set(v.color, v.color_hex)
    return [...seen].map(([name, hex]) => ({ name, hex }))
  }, [product.variants])

  // The selected colour lives in the URL (?color=Navy), so a shared link opens on that colour.
  const color = colors.some((c) => c.name === searchParams.get('color')) ? searchParams.get('color') : colors[0]?.name
  const [variantId, setVariantId] = useState(null)
  const [attempted, setAttempted] = useState(false)

  const variants = product.variants.filter((v) => v.color === color)
  const selected = variants.find((v) => v.id === variantId)
  const images = product.images.filter((img) => img.color === color || img.color === null)
  const kind = /^\d+$/.test(product.variants[0]?.size) ? 'bottoms' : 'tops'
  const colorInStock = (name) => product.variants.some((v) => v.color === name && v.stock_quantity > 0)

  function chooseColor(name) {
    setSearchParams((params) => {
      params.set('color', name)
      return params
    }, { replace: true, preventScrollReset: true })
    // Keep the same size in the new colour if it exists.
    const sameSize = product.variants.find((v) => v.color === name && v.size === selected?.size)
    setVariantId(sameSize?.id ?? null)
  }

  function addToCart() {
    setAttempted(true)
    if (!selected || selected.stock_quantity === 0) return
    dispatch(
      addItem({
        variantId: selected.id,
        productId: product.id,
        slug: product.slug,
        name: product.name,
        size: selected.size,
        color: selected.color,
        image: images[0]?.url,
        priceCents: product.price_cents,
        compareAtCents: product.compare_at_price_cents,
        stockQuantity: selected.stock_quantity,
      })
    )
  }

  const soldOut = selected?.stock_quantity === 0
  const highlights = Object.entries(product.highlights ?? {})

  return (
    <div className={styles.main}>
      <nav aria-label="Breadcrumb" className={styles.breadcrumbs}>
        <Link to="/">Home</Link>
        {product.parent_category && (
          <>
            <Icon name="chevronRight" size={12} />
            <Link to={`/c/${product.parent_category.slug}`}>{product.parent_category.name}</Link>
          </>
        )}
        <Icon name="chevronRight" size={12} />
        <Link to={`/c/${product.category.slug}`}>{product.category.name}</Link>
      </nav>

      <div className={styles.grid}>
        <div className={styles.media}>
          <Gallery key={color} images={images} name={product.name} />
        </div>

        <div className={styles.info}>
          {product.badge && <p className={styles.badge} data-badge={product.badge}>{BADGE_LABEL[product.badge]}</p>}
          <h1 className={styles.name}>{product.name}</h1>
          <p className={styles.sub}>
            {product.fit} · {product.fabric}
          </p>
          {product.rating_count > 0 && (
            <a href="#reviews" className={styles.ratingLink}>
              <Rating average={product.rating_avg} count={product.rating_count} variant="inline" />
              <span className="link">{product.rating_count} reviews</span>
            </a>
          )}

          <div className={styles.priceBlock}>
            <Price priceCents={product.price_cents} compareAtCents={product.compare_at_price_cents} size="lg" />
            <p className={styles.tax}>Inclusive of all taxes</p>
          </div>

          <div className={styles.colorBlock}>
            <p className={styles.label}>
              Colour: <span>{color}</span>
            </p>
            <div className={styles.swatches} role="radiogroup" aria-label="Choose a colour">
              {colors.map((c) => (
                <button
                  key={c.name}
                  role="radio"
                  aria-checked={c.name === color}
                  aria-label={`${c.name}${colorInStock(c.name) ? '' : ', sold out'}`}
                  title={c.name}
                  className={styles.swatch}
                  data-soldout={!colorInStock(c.name)}
                  style={{ '--swatch': c.hex }}
                  onClick={() => chooseColor(c.name)}
                />
              ))}
            </div>
          </div>

          <SizeSelector variants={variants} selectedId={variantId} onSelect={setVariantId} kind={kind} />
          {attempted && !selected && <p className={styles.pickSize} role="alert">Please choose a size first.</p>}

          <div className={styles.actions}>
            {soldOut ? (
              <NotifyMe variant={selected} />
            ) : (
              <button className="btn btn-primary" onClick={addToCart}>
                <Icon name="bag" size={18} /> Add to bag
              </button>
            )}
            <WishlistButton productId={product.id} name={product.name} variant="full" />
          </div>

          <DeliveryCheck />
          <OfferCards />

          {highlights.length > 0 && (
            <dl className={styles.specs}>
              {highlights.map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}

          <Accordion
            items={[
              { title: 'Description', subtitle: 'What makes it different', content: <p>{product.description}</p> },
              { title: 'Fabric and care', subtitle: product.fabric, content: <p>{product.care}</p> },
              {
                title: 'Shipping and returns',
                subtitle: 'Free over ₹999 · 15-day returns',
                content: (
                  <p>
                    Dispatched within 24 hours from Bengaluru. Free shipping on orders above ₹999, otherwise ₹79. Return or
                    exchange unworn items within 15 days. <Link to="/help#returns" className="link">Read the full policy</Link>.
                  </p>
                ),
              },
            ]}
            defaultOpen={-1}
          />
        </div>
      </div>

      {/* Mobile: the purchase button stays reachable while scrolling. */}
      <div className={styles.stickyBar}>
        <Price priceCents={product.price_cents} compareAtCents={product.compare_at_price_cents} size="sm" />
        {soldOut ? (
          <a href="#notify" className="btn btn-outline btn-sm">Notify me</a>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={addToCart}>
            {selected ? 'Add to bag' : 'Select size'}
          </button>
        )}
      </div>
    </div>
  )
}

function NotifyMe({ variant }) {
  const [email, setEmail] = useState('')
  const [notify, { isLoading, isSuccess, error, reset }] = useNotifyMeMutation()
  const dispatch = useDispatch()

  useEffect(() => reset(), [variant.id, reset])

  async function submit(event) {
    event.preventDefault()
    try {
      await notify({ variantId: variant.id, email }).unwrap()
      dispatch(showToast(`We'll email you when ${variant.size} is back`))
    } catch {
      // shown below
    }
  }

  if (isSuccess) {
    return (
      <p className={styles.notified} id="notify">
        <Icon name="check" size={18} /> You're on the list for size {variant.size}.
      </p>
    )
  }

  return (
    <form className={styles.notify} onSubmit={submit} id="notify">
      <p className={styles.notifyText}>
        <Icon name="bell" size={16} /> Size {variant.size} is sold out. Get an email when it's back.
      </p>
      <div className={styles.notifyRow}>
        <input className="input" type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
        <button className="btn btn-primary" disabled={isLoading}>Notify me</button>
      </div>
      {error && <p className="field-error">{errorMessage(error)}</p>}
    </form>
  )
}

function ProductSkeleton() {
  return (
    <div className={`container page ${styles.grid}`}>
      <Skeleton height="auto" radius="var(--radius-lg)" style={{ aspectRatio: '4 / 5' }} />
      <div className={styles.info}>
        <Skeleton width="70%" height="2.4rem" />
        <Skeleton width="40%" />
        <Skeleton width="30%" height="2rem" />
        <Skeleton height="3rem" />
        <Skeleton height="3rem" />
      </div>
    </div>
  )
}
