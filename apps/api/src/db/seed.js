import { pool } from './pool.js'

await pool.query(
  'TRUNCATE order_items, orders, product_variants, products, categories RESTART IDENTITY CASCADE'
)


const categories = [
    { name: 'Shirts', slug: 'shirts' },
    { name: 'Pants', slug: 'pants' },
    { name: 'Jackets', slug: 'jackets' },
  ]
  
  const categoryIdBySlug = {}
  for (const category of categories) {
    const { rows } = await pool.query(
      'INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING id',
      [category.name, category.slug]
    )
    categoryIdBySlug[category.slug] = rows[0].id
  }
  

  const products = [
    {
      categorySlug: 'shirts',
      name: 'Classic Oxford Shirt',
      slug: 'classic-oxford-shirt',
      description: 'A tailored cotton oxford shirt for everyday wear.',
      basePriceCents: 4500,
      variants: [
        { size: 'S', color: 'White', sku: 'SHIRT-OXF-S-WHT', stock: 20 },
        { size: 'M', color: 'White', sku: 'SHIRT-OXF-M-WHT', stock: 25 },
        { size: 'L', color: 'White', sku: 'SHIRT-OXF-L-WHT', stock: 15 },
        { size: 'M', color: 'Blue', sku: 'SHIRT-OXF-M-BLU', stock: 18 },
      ],
    },
    {
      categorySlug: 'shirts',
      name: 'Linen Short Sleeve Shirt',
      slug: 'linen-short-sleeve-shirt',
      description: 'Breathable linen blend, made for warm weather.',
      basePriceCents: 3900,
      variants: [
        { size: 'S', color: 'Sand', sku: 'SHIRT-LIN-S-SAND', stock: 12 },
        { size: 'M', color: 'Sand', sku: 'SHIRT-LIN-M-SAND', stock: 16 },
        { size: 'L', color: 'Navy', sku: 'SHIRT-LIN-L-NAVY', stock: 10 },
      ],
    },
    {
      categorySlug: 'pants',
      name: 'Slim Chino',
      slug: 'slim-chino',
      description: 'A slim-fit chino that goes from desk to dinner.',
      basePriceCents: 5500,
      variants: [
        { size: '30', color: 'Khaki', sku: 'PANT-CHI-30-KHK', stock: 14 },
        { size: '32', color: 'Khaki', sku: 'PANT-CHI-32-KHK', stock: 20 },
        { size: '34', color: 'Black', sku: 'PANT-CHI-34-BLK', stock: 17 },
      ],
    },
    {
      categorySlug: 'pants',
      name: 'Straight Denim',
      slug: 'straight-denim',
      description: 'A durable straight-leg denim in a mid wash.',
      basePriceCents: 6900,
      variants: [
        { size: '30', color: 'Mid Wash', sku: 'PANT-DEN-30-MID', stock: 11 },
        { size: '32', color: 'Mid Wash', sku: 'PANT-DEN-32-MID', stock: 19 },
        { size: '34', color: 'Dark Wash', sku: 'PANT-DEN-34-DRK', stock: 13 },
      ],
    },
    {
      categorySlug: 'jackets',
      name: 'Waxed Field Jacket',
      slug: 'waxed-field-jacket',
      description: 'A waxed cotton field jacket built for wet weather.',
      basePriceCents: 12900,
      variants: [
        { size: 'M', color: 'Olive', sku: 'JKT-FLD-M-OLV', stock: 8 },
        { size: 'L', color: 'Olive', sku: 'JKT-FLD-L-OLV', stock: 6 },
        { size: 'L', color: 'Black', sku: 'JKT-FLD-L-BLK', stock: 5 },
      ],
    },
    {
      categorySlug: 'jackets',
      name: 'Quilted Bomber',
      slug: 'quilted-bomber',
      description: 'A lightweight quilted bomber for cool evenings.',
      basePriceCents: 9500,
      variants: [
        { size: 'S', color: 'Navy', sku: 'JKT-BMB-S-NVY', stock: 9 },
        { size: 'M', color: 'Navy', sku: 'JKT-BMB-M-NVY', stock: 12 },
        { size: 'M', color: 'Charcoal', sku: 'JKT-BMB-M-CHR', stock: 7 },
      ],
    },
  ]

  for (const product of products) {
    const { rows } = await pool.query(
      `INSERT INTO products (category_id, name, slug, description, base_price_cents)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        categoryIdBySlug[product.categorySlug],
        product.name,
        product.slug,
        product.description,
        product.basePriceCents,
      ]
    )
    const productId = rows[0].id
  
    for (const variant of product.variants) {
      await pool.query(
        `INSERT INTO product_variants (product_id, size, color, sku, stock_quantity)
         VALUES ($1, $2, $3, $4, $5)`,
        [productId, variant.size, variant.color, variant.sku, variant.stock]
      )
    }
  }
  
  console.log('seed complete')
  await pool.end()
  
  