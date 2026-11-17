import ProductCard, { ProductCardSkeleton } from './ProductCard.jsx'
import styles from './ProductGrid.module.css'

/** Responsive grid. `columns` is the desktop density (2, 3 or 4); mobile is always 2. */
export default function ProductGrid({ products, loading = false, skeletonCount = 8, columns = 4 }) {
  return (
    <div className={styles.grid} data-columns={columns}>
      {products?.map((product, index) => (
        <ProductCard key={product.id} product={product} priority={index < 4} />
      ))}
      {loading && Array.from({ length: skeletonCount }, (_, i) => <ProductCardSkeleton key={`s${i}`} />)}
    </div>
  )
}
