import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useGetProductsQuery } from '../store/apiSlice.js'
import { selectWishlistIds } from '../store/wishlistSlice.js'
import { useDocumentTitle } from '../lib/hooks.js'
import { pluralize } from '../lib/format.js'
import ProductGrid from '../components/product/ProductGrid.jsx'
import { EmptyState } from '../components/ui/Feedback.jsx'

export default function Wishlist() {
  useDocumentTitle('Wishlist')
  const ids = useSelector(selectWishlistIds)
  const { data, isLoading } = useGetProductsQuery({ ids, limit: 48 }, { skip: ids.length === 0 })

  if (ids.length === 0) {
    return (
      <div className="container page">
        <EmptyState icon="heart" title="Your wishlist is empty" action={<Link to="/shop" className="btn btn-primary">Find something you love</Link>}>
          Tap the heart on any product to save it here for later.
        </EmptyState>
      </div>
    )
  }

  // Show newest-saved first: the order of `ids`, not the API's order.
  const order = new Map(ids.map((id, i) => [id, i]))
  const products = data ? [...data.items].sort((a, b) => order.get(a.id) - order.get(b.id)) : []

  return (
    <div className="container page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 className="page-title">Wishlist</h1>
        <p style={{ color: 'var(--color-ink-3)' }}>{pluralize(ids.length, 'item')} saved on this device</p>
      </div>
      <ProductGrid products={products} loading={isLoading} skeletonCount={Math.min(ids.length, 8)} />
    </div>
  )
}
