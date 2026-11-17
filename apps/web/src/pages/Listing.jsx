import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { errorMessage, useGetCategoriesQuery, useGetCollectionQuery, useGetProductsQuery } from '../store/apiSlice.js'
import { SORT_OPTIONS, activeBucket, countActiveFilters, readFilters, toggleInList, updateParams } from '../lib/filters.js'
import { formatPrice, pluralize } from '../lib/format.js'
import { useDocumentTitle, useStoredState } from '../lib/hooks.js'
import FilterPanel from '../components/listing/FilterPanel.jsx'
import ProductGrid from '../components/product/ProductGrid.jsx'
import Drawer from '../components/ui/Drawer.jsx'
import Icon from '../components/ui/Icon.jsx'
import { EmptyState, ErrorMessage, Skeleton } from '../components/ui/Feedback.jsx'
import styles from './Listing.module.css'

const PAGE_SIZE = 24

export default function Listing({ mode }) {
  const { slug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => readFilters(searchParams), [searchParams])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [columns, setColumns] = useStoredState('lth:grid-columns', 4)

  const { data: categories = [] } = useGetCategoriesQuery()
  const { data: collection } = useGetCollectionQuery(slug, { skip: mode !== 'collection' })

  const categorySlug = mode === 'category' ? slug : filters.category
  const { current: category, parent: parentCategory } = findCategory(categories, categorySlug)

  // The query for the API: everything except pagination.
  const query = {
    category: categorySlug,
    collection: mode === 'collection' ? slug : undefined,
    q: mode === 'search' ? filters.q : undefined,
    sizes: filters.sizes,
    colors: filters.colors,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    onSale: filters.onSale,
    sort: filters.sort,
    limit: PAGE_SIZE,
  }

  // Page 1 drives the header, facets and total. `data` keeps the previous
  // result while new filters load, so the facets don't flash empty.
  const first = useGetProductsQuery({ ...query, page: 1 })
  const result = first.data

  const title =
    mode === 'collection' ? collection?.name
    : mode === 'search' ? `Results for "${filters.q ?? ''}"`
    : category ? category.name
    : filters.onSale ? 'Sale'
    : filters.sort === 'newest' ? 'New in'
    : 'All products'
  useDocumentTitle(title)

  const setFilters = (changes) => setSearchParams(updateParams(searchParams, changes), { replace: true })
  const clearAll = () => setSearchParams(updateParams(searchParams, { sizes: [], colors: [], minPrice: null, maxPrice: null, onSale: false }))
  const activeCount = countActiveFilters(filters)

  // Sibling or child categories as chips (Powerlook style).
  const chipParent = parentCategory ?? category
  const chips = chipParent?.children ?? []
  // Keep the shopper's filters when switching subcategory, but not the page count.
  const carryOver = updateParams(searchParams, { category: null }).toString()

  return (
    <div className={`container page ${styles.page}`}>
      <nav aria-label="Breadcrumb" className={styles.breadcrumbs}>
        <Link to="/">Home</Link>
        {parentCategory && (
          <>
            <Icon name="chevronRight" size={12} />
            <Link to={`/c/${parentCategory.slug}`}>{parentCategory.name}</Link>
          </>
        )}
        <Icon name="chevronRight" size={12} />
        <span aria-current="page">{title ?? '…'}</span>
      </nav>

      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{title ?? <Skeleton width="10ch" />}</h1>
          {collection?.tagline && <p className={styles.tagline}>{collection.tagline}</p>}
        </div>
        {result && <p className={styles.count}>{pluralize(result.total, 'product')}</p>}
      </header>

      {chips.length > 0 && (
        <ul className={styles.chips}>
          <li>
            <Link to={`/c/${chipParent.slug}?${carryOver}`} className={styles.chip} aria-current={category?.slug === chipParent.slug ? 'page' : undefined}>
              All {chipParent.name}
            </Link>
          </li>
          {chips.map((c) => (
            <li key={c.slug}>
              <Link to={`/c/${c.slug}?${carryOver}`} className={styles.chip} aria-current={category?.slug === c.slug ? 'page' : undefined}>
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.toolbar}>
        <button className={`btn btn-outline btn-sm ${styles.filterButton}`} onClick={() => setFiltersOpen(true)}>
          <Icon name="filter" size={16} /> Filters {activeCount > 0 && `(${activeCount})`}
        </button>
        <ActiveFilters filters={filters} onChange={setFilters} onClear={clearAll} />
        <div className={styles.toolbarRight}>
          <label className={styles.sort}>
            <span className="visually-hidden">Sort by</span>
            <select value={result?.sort ?? filters.sort ?? 'featured'} onChange={(e) => setFilters({ sort: e.target.value })} className={styles.select}>
              {mode === 'search' && <option value="relevance">Relevance</option>}
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  Sort: {o.label}
                </option>
              ))}
            </select>
          </label>
          <div className={styles.density} role="group" aria-label="Grid density">
            {[2, 3, 4].map((n) => (
              <button key={n} aria-pressed={columns === n} onClick={() => setColumns(n)} aria-label={`${n} columns`}>
                <Icon name={`grid${n}`} size={18} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.layout}>
        <aside className={styles.sidebar} aria-label="Filters">
          <FilterPanel filters={filters} facets={result?.facets} onChange={setFilters} />
        </aside>

        <section className={styles.results} aria-busy={first.isFetching} data-stale={first.isFetching && !first.isLoading}>
          {first.error ? (
            <ErrorMessage onRetry={first.refetch}>{errorMessage(first.error)}</ErrorMessage>
          ) : first.isLoading ? (
            <ProductGrid loading columns={columns} skeletonCount={8} />
          ) : result.total === 0 ? (
            <EmptyState
              icon="search"
              title={mode === 'search' ? `Nothing found for "${filters.q}"` : 'No products match these filters'}
              action={
                activeCount > 0 ? (
                  <button className="btn btn-primary" onClick={clearAll}>Clear filters</button>
                ) : (
                  <Link to="/shop" className="btn btn-primary">Browse all products</Link>
                )
              }
            >
              {mode === 'search' ? 'Check the spelling, or try a broader word like "shirt" or "jeans".' : 'Try removing a filter or two.'}
            </EmptyState>
          ) : (
            <>
              <ProductGrid products={result.items} columns={columns} />
              {/* Later pages: each is its own query (and cache entry). */}
              {Array.from({ length: Math.min(filters.pages, result.totalPages) - 1 }, (_, i) => (
                <MorePage key={i + 2} query={query} page={i + 2} columns={columns} />
              ))}
              <LoadMore
                shown={Math.min(filters.pages * PAGE_SIZE, result.total)}
                total={result.total}
                hasMore={filters.pages < result.totalPages}
                onMore={() => setSearchParams(updateParams(searchParams, { page: filters.pages + 1 }), { replace: true, preventScrollReset: true })}
              />
            </>
          )}
        </section>
      </div>

      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        side="left"
        title="Filters"
        width={380}
        footer={
          <div className={styles.drawerButtons}>
            <button className="btn btn-outline" onClick={clearAll} disabled={activeCount === 0}>Clear all</button>
            <button className="btn btn-primary" onClick={() => setFiltersOpen(false)}>
              Show {result ? pluralize(result.total, 'result') : 'results'}
            </button>
          </div>
        }
      >
        <div className={styles.drawerPanel}>
          <FilterPanel filters={filters} facets={result?.facets} onChange={setFilters} />
        </div>
      </Drawer>
    </div>
  )
}

function MorePage({ query, page, columns }) {
  const { data, isLoading } = useGetProductsQuery({ ...query, page })
  return (
    <div className={styles.morePage}>
      <ProductGrid products={data?.items} loading={isLoading} columns={columns} skeletonCount={4} />
    </div>
  )
}

function LoadMore({ shown, total, hasMore, onMore }) {
  return (
    <div className={styles.loadMore}>
      <p>
        Showing {shown} of {total}
      </p>
      <div className={styles.progress}>
        <span style={{ width: `${(shown / total) * 100}%` }} />
      </div>
      {hasMore && (
        <button className="btn btn-outline" onClick={onMore}>
          Load more
        </button>
      )}
    </div>
  )
}

function ActiveFilters({ filters, onChange, onClear }) {
  const bucket = activeBucket(filters)
  const chips = [
    ...filters.sizes.map((s) => ({ key: `s-${s}`, label: `Size ${s}`, remove: () => onChange({ sizes: toggleInList(filters.sizes, s) }) })),
    ...filters.colors.map((c) => ({ key: `c-${c}`, label: c, remove: () => onChange({ colors: toggleInList(filters.colors, c) }) })),
    ...(filters.minPrice != null || filters.maxPrice != null
      ? [{
          key: 'price',
          label: bucket?.label ?? `${formatPrice(filters.minPrice ?? 0)} – ${filters.maxPrice ? formatPrice(filters.maxPrice) : 'any'}`,
          remove: () => onChange({ minPrice: null, maxPrice: null }),
        }]
      : []),
    ...(filters.onSale ? [{ key: 'sale', label: 'On sale', remove: () => onChange({ onSale: false }) }] : []),
  ]
  if (!chips.length) return <div className={styles.activeFilters} />

  return (
    <ul className={styles.activeFilters} aria-label="Active filters">
      {chips.map((chip) => (
        <li key={chip.key}>
          <button className={styles.activeChip} onClick={chip.remove} aria-label={`Remove filter: ${chip.label}`}>
            {chip.label} <Icon name="close" size={12} />
          </button>
        </li>
      ))}
      <li>
        <button className={`${styles.clear} link`} onClick={onClear}>Clear all</button>
      </li>
    </ul>
  )
}

function findCategory(tree, slug) {
  if (!slug) return {}
  for (const parent of tree) {
    if (parent.slug === slug) return { current: parent, parent: null }
    const child = parent.children.find((c) => c.slug === slug)
    if (child) return { current: child, parent }
  }
  return {}
}
