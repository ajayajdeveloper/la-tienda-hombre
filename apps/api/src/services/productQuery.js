// Builds the SQL for the product listing: dynamic filters, sorting,
// pagination and facet counts.
//
// The rule that keeps this safe: user input NEVER goes into the SQL string.
// Every value is pushed into `params` and referenced as $1, $2, ...; only
// fixed fragments written in this file are concatenated. Sort keys come from a
// whitelist map, never from the request.
import { pool } from '../db/pool.js'

export const SORTS = {
  featured: `CASE p.badge WHEN 'new' THEN 0 WHEN 'bestseller' THEN 1 WHEN 'limited' THEN 2 ELSE 3 END, p.sold_count DESC`,
  newest: 'p.created_at DESC',
  price_asc: 'p.base_price_cents ASC',
  price_desc: 'p.base_price_cents DESC',
  popular: 'p.sold_count DESC',
  rating: `(CASE WHEN p.rating_count > 0 THEN p.rating_sum::numeric / p.rating_count ELSE 0 END) DESC, p.rating_count DESC`,
  discount: `(COALESCE(p.compare_at_price_cents, p.base_price_cents) - p.base_price_cents)::numeric
             / p.base_price_cents DESC`,
  relevance: null, // filled in per query (needs the tsquery parameter)
}

/** "linen shirt" -> "linen:* & shirt:*" : every word must match, as a prefix (typeahead). */
export function toPrefixTsQuery(text) {
  const words = (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).slice(0, 6)
  return words.length ? words.map((w) => `${w}:*`).join(' & ') : null
}

/**
 * Turn filter options into WHERE clauses + params.
 * `except` leaves one filter out, which is how facet counts work: the size
 * facet is counted with every filter EXCEPT size, so selecting "M" still shows
 * how many products come in "L" (otherwise every other size would show 0).
 */
function buildFilters(filters, { except } = {}) {
  const where = ['p.is_active']
  const params = []
  const param = (value) => {
    params.push(value)
    return `$${params.length}`
  }

  if (filters.category) {
    // Recursive CTE: the category itself plus all its descendants, so
    // /c/shirts includes Linen Shirts, Check Shirts, and so on.
    where.push(`p.category_id IN (
      WITH RECURSIVE tree AS (
        SELECT id FROM categories WHERE slug = ${param(filters.category)}
        UNION ALL
        SELECT c.id FROM categories c JOIN tree ON c.parent_id = tree.id
      )
      SELECT id FROM tree)`)
  }

  if (filters.collection) {
    where.push(`EXISTS (
      SELECT 1 FROM product_collections pc JOIN collections col ON col.id = pc.collection_id
      WHERE pc.product_id = p.id AND col.slug = ${param(filters.collection)})`)
  }

  if (filters.ids?.length) {
    where.push(`p.id = ANY(${param(filters.ids)}::int[])`)
  }

  const tsQuery = filters.q ? toPrefixTsQuery(filters.q) : null
  let tsParam = null
  if (tsQuery) {
    tsParam = param(tsQuery)
    where.push(`p.search_vector @@ to_tsquery('english', ${tsParam})`)
  }

  if (except !== 'price') {
    if (filters.minPrice != null) where.push(`p.base_price_cents >= ${param(filters.minPrice)}`)
    if (filters.maxPrice != null) where.push(`p.base_price_cents <= ${param(filters.maxPrice)}`)
  }

  if (filters.onSale) where.push('p.compare_at_price_cents > p.base_price_cents')

  // Size and colour are checked on the SAME variant row, and only in-stock
  // variants count: "M in Navy" means a Navy M you can actually buy, not
  // "has an M in some colour and Navy in some size".
  const sizes = except === 'size' ? [] : filters.sizes ?? []
  const colors = except === 'color' ? [] : filters.colors ?? []
  if (sizes.length || colors.length) {
    const conditions = ['v.product_id = p.id', 'v.stock_quantity > 0']
    if (sizes.length) conditions.push(`v.size = ANY(${param(sizes)}::text[])`)
    if (colors.length) conditions.push(`v.color = ANY(${param(colors)}::text[])`)
    where.push(`EXISTS (SELECT 1 FROM product_variants v WHERE ${conditions.join(' AND ')})`)
  }

  return { where: where.join(' AND '), params, param, tsParam }
}

// Card data for one page of products. Pagination happens FIRST (in `page`),
// then images, colours and stock are looked up only for those 24 rows,
// not for every product that matched the filter.
export async function listProducts(filters) {
  const { page = 1, limit = 24 } = filters
  const base = buildFilters(filters)

  let sortKey = filters.sort ?? (base.tsParam ? 'relevance' : 'featured')
  if (sortKey === 'relevance' && !base.tsParam) sortKey = 'featured'
  const orderBy =
    sortKey === 'relevance'
      ? `ts_rank(p.search_vector, to_tsquery('english', ${base.tsParam})) DESC, p.sold_count DESC`
      : SORTS[sortKey]

  const limitParam = base.param(limit)
  const offsetParam = base.param((page - 1) * limit)

  const itemsSql = `
    WITH page AS (
      SELECT p.id, ROW_NUMBER() OVER (ORDER BY ${orderBy}, p.id) AS position
      FROM products p
      WHERE ${base.where}
      ORDER BY ${orderBy}, p.id   -- p.id breaks ties so pages never overlap
      LIMIT ${limitParam} OFFSET ${offsetParam}
    )
    ${CARD_SELECT}
    FROM page
    JOIN products p ON p.id = page.id
    ${CARD_JOINS}
    ORDER BY page.position`

  const countFilters = buildFilters(filters)
  const countSql = `SELECT count(*) AS total FROM products p WHERE ${countFilters.where}`

  const [items, count, facets] = await Promise.all([
    pool.query(itemsSql, base.params),
    pool.query(countSql, countFilters.params),
    facetCounts(filters),
  ])

  const total = count.rows[0].total
  return {
    items: items.rows,
    total,
    page,
    pageSize: limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    sort: sortKey,
    facets,
  }
}

async function facetCounts(filters) {
  const sizeF = buildFilters(filters, { except: 'size' })
  const sizeColorClause = filters.colors?.length ? `AND v.color = ANY(${sizeF.param(filters.colors)}::text[])` : ''
  const sizeSql = `
    SELECT v.size AS value, count(DISTINCT p.id) AS count, min(v.size_order) AS rank
    FROM products p JOIN product_variants v ON v.product_id = p.id
    WHERE ${sizeF.where} AND v.stock_quantity > 0 ${sizeColorClause}
    GROUP BY v.size
    ORDER BY (v.size ~ '^[0-9]+$'), rank, v.size`

  const colorF = buildFilters(filters, { except: 'color' })
  const colorSizeClause = filters.sizes?.length ? `AND v.size = ANY(${colorF.param(filters.sizes)}::text[])` : ''
  const colorSql = `
    SELECT v.color AS value, min(v.color_hex) AS hex, count(DISTINCT p.id) AS count
    FROM products p JOIN product_variants v ON v.product_id = p.id
    WHERE ${colorF.where} AND v.stock_quantity > 0 ${colorSizeClause}
    GROUP BY v.color
    ORDER BY count DESC, v.color`

  const priceF = buildFilters(filters, { except: 'price' })
  const priceSql = `
    SELECT min(p.base_price_cents) AS min, max(p.base_price_cents) AS max
    FROM products p WHERE ${priceF.where}`

  const [sizes, colors, price] = await Promise.all([
    pool.query(sizeSql, sizeF.params),
    pool.query(colorSql, colorF.params),
    pool.query(priceSql, priceF.params),
  ])

  return {
    sizes: sizes.rows.map(({ value, count }) => ({ value, count })),
    colors: colors.rows,
    price: price.rows[0],
  }
}

// Shared by the listing, similar products and search suggestions, so every
// product card in the app gets exactly the same shape.
export const CARD_SELECT = `
  SELECT p.id, p.name, p.slug, p.base_price_cents AS price_cents, p.compare_at_price_cents,
         p.badge, p.fit, c.slug AS category_slug, c.name AS category_name,
         p.rating_count,
         CASE WHEN p.rating_count > 0 THEN round(p.rating_sum::numeric / p.rating_count, 1) END AS rating_avg,
         COALESCE(img.images, '[]') AS images,
         COALESCE(col.colors, '[]') AS colors,
         COALESCE(stk.in_stock, false) AS in_stock`

export const CARD_JOINS = `
  JOIN categories c ON c.id = p.category_id
  LEFT JOIN LATERAL (
    SELECT json_agg(url ORDER BY sort_order) AS images
    FROM (SELECT url, sort_order FROM product_images
          WHERE product_id = p.id ORDER BY sort_order LIMIT 2) first_two
  ) img ON true
  LEFT JOIN LATERAL (
    SELECT json_agg(json_build_object('name', color, 'hex', color_hex) ORDER BY first_id) AS colors
    FROM (SELECT color, color_hex, min(id) AS first_id FROM product_variants
          WHERE product_id = p.id GROUP BY color, color_hex) distinct_colors
  ) col ON true
  LEFT JOIN LATERAL (
    SELECT bool_or(stock_quantity > 0) AS in_stock FROM product_variants WHERE product_id = p.id
  ) stk ON true`
