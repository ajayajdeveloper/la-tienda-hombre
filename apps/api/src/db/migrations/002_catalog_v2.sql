-- v2 catalog: subcategories, richer products, images, collections, coupons,
-- delivery zones, reviews, stock notifications, and order snapshots.
--
-- Written to work on BOTH an empty database (just after 001) and a v1
-- database that already has rows: new NOT NULL columns get defaults, and
-- existing rows are backfilled before constraints that depend on them.

-- ---------------------------------------------------------------- categories
-- A self-referencing FK turns the flat list into a tree:
-- "Shirts" (parent_id NULL) -> "Linen Shirts" (parent_id = Shirts.id).
ALTER TABLE categories ADD COLUMN parent_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT;
ALTER TABLE categories ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE categories ADD COLUMN image_url TEXT;
CREATE INDEX idx_categories_parent_id ON categories(parent_id);

-- ------------------------------------------------------------------ products
-- compare_at_price = the MRP shown struck through. NULL means "not on sale".
ALTER TABLE products ADD COLUMN compare_at_price_cents INTEGER;
ALTER TABLE products ADD COLUMN badge TEXT;
ALTER TABLE products ADD COLUMN fit TEXT;
ALTER TABLE products ADD COLUMN fabric TEXT;
-- Spec grid on the product page (Fit, Fabric, Neck, Sleeve...). JSONB because the
-- keys differ per category and we never filter on them.
ALTER TABLE products ADD COLUMN highlights JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE products ADD COLUMN care TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
-- Denormalised counters, updated in the same transaction as the write that
-- changes them. They make "sort by popularity / rating" a plain ORDER BY
-- instead of an aggregate over every order and review on each listing request.
ALTER TABLE products ADD COLUMN sold_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN rating_sum INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN rating_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE products ADD CONSTRAINT products_price_positive CHECK (base_price_cents > 0);
ALTER TABLE products ADD CONSTRAINT products_mrp_gte_price
  CHECK (compare_at_price_cents IS NULL OR compare_at_price_cents >= base_price_cents);
ALTER TABLE products ADD CONSTRAINT products_badge_valid
  CHECK (badge IS NULL OR badge IN ('new', 'bestseller', 'limited'));

-- Full-text search. A GENERATED column is recomputed by Postgres on every
-- INSERT/UPDATE, so it can never drift out of sync with the text it indexes.
-- Weights rank a match in the name (A) above fabric/fit (B) above description (C).
ALTER TABLE products ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(fabric, '') || ' ' || coalesce(fit, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'C')
) STORED;

CREATE INDEX idx_products_search ON products USING GIN (search_vector);
CREATE INDEX idx_products_created_at ON products(created_at DESC);
CREATE INDEX idx_products_price ON products(base_price_cents);

-- ---------------------------------------------------------- product_variants
ALTER TABLE product_variants ADD COLUMN color_hex TEXT NOT NULL DEFAULT '#888888';
-- Sizes don't sort alphabetically (L < M < S < XL). An explicit rank does:
-- S=1, M=2, L=3, XL=4; waist sizes use their number.
ALTER TABLE product_variants ADD COLUMN size_order SMALLINT NOT NULL DEFAULT 0;
-- The last line of defence against overselling: even a buggy code path
-- cannot push stock below zero.
ALTER TABLE product_variants ADD CONSTRAINT variants_stock_non_negative CHECK (stock_quantity >= 0);

-- ------------------------------------------------------------ product_images
-- `color` ties a photo to a colourway, so picking "Navy" swaps the gallery.
-- NULL colour = applies to every colour.
CREATE TABLE product_images (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color TEXT,
  url TEXT NOT NULL,
  alt TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_product_images_product ON product_images(product_id, sort_order);

-- --------------------------------------------------------------- collections
-- Occasion groups ("Office", "Linen days") cut ACROSS categories, so they are a
-- many-to-many join table rather than another category level.
CREATE TABLE collections (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  tagline TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE product_collections (
  collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (collection_id, product_id)
);
-- The PK index serves "products in collection X"; this one serves the reverse.
CREATE INDEX idx_product_collections_product ON product_collections(product_id);

-- ------------------------------------------------------------------- coupons
CREATE TABLE coupons (
  code TEXT PRIMARY KEY CHECK (code = upper(code)),
  description TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'flat')),
  discount_value INTEGER NOT NULL CHECK (discount_value > 0),
  max_discount_cents INTEGER,
  min_subtotal_cents INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  usage_limit INTEGER,
  times_used INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  CHECK (discount_type <> 'percent' OR discount_value <= 100),
  CHECK (usage_limit IS NULL OR times_used <= usage_limit)
);

-- ------------------------------------------------------------ delivery_zones
-- Delivery estimates by pincode PREFIX, not one row per pincode (India has
-- ~19,000). Lookup = the longest prefix that matches, so a metro override like
-- '560' (Bengaluru, 2 days) beats its region '56' (4 days).
CREATE TABLE delivery_zones (
  prefix TEXT PRIMARY KEY CHECK (prefix ~ '^[1-9][0-9]{0,5}$'),
  region TEXT NOT NULL,
  delivery_days SMALLINT NOT NULL CHECK (delivery_days > 0),
  cod_available BOOLEAN NOT NULL DEFAULT true
);

-- ------------------------------------------------------------------- reviews
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  author_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_product ON reviews(product_id, created_at DESC);

-- ------------------------------------------------------- stock_notifications
-- "Notify me when my size is back". UNIQUE makes a double-click harmless.
CREATE TABLE stock_notifications (
  id SERIAL PRIMARY KEY,
  variant_id INTEGER NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at TIMESTAMPTZ,
  UNIQUE (variant_id, email)
);

-- -------------------------------------------------------------------- orders
-- public_id: the ID shown in URLs. Serial IDs are guessable (/orders/41,
-- /orders/42...), which would let anyone read anyone's order. A random UUID is not.
-- gen_random_uuid() is built into Postgres 13+.
ALTER TABLE orders ADD COLUMN public_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid();
ALTER TABLE orders ADD COLUMN customer_phone TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN pincode TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'cod';
ALTER TABLE orders ADD COLUMN coupon_code TEXT REFERENCES coupons(code);
ALTER TABLE orders ADD COLUMN subtotal_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN discount_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN shipping_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN estimated_delivery_days SMALLINT;

-- Backfill v1 orders (they had no discounts or shipping), THEN add the check.
UPDATE orders SET subtotal_cents = total_cents WHERE subtotal_cents = 0;
ALTER TABLE orders ADD CONSTRAINT orders_total_consistent
  CHECK (total_cents = subtotal_cents - discount_cents + shipping_cents);
ALTER TABLE orders ADD CONSTRAINT orders_status_valid
  CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled'));
ALTER TABLE orders ADD CONSTRAINT orders_payment_valid CHECK (payment_method IN ('cod'));

-- --------------------------------------------------------------- order_items
-- Snapshot what was bought. If the product is renamed or the variant deleted
-- later, the order must still show what the customer actually paid for.
ALTER TABLE order_items ADD COLUMN product_name TEXT NOT NULL DEFAULT '';
ALTER TABLE order_items ADD COLUMN size TEXT NOT NULL DEFAULT '';
ALTER TABLE order_items ADD COLUMN color TEXT NOT NULL DEFAULT '';

UPDATE order_items oi
SET product_name = p.name, size = pv.size, color = pv.color
FROM product_variants pv
JOIN products p ON p.id = pv.product_id
WHERE pv.id = oi.product_variant_id AND oi.product_name = '';

ALTER TABLE order_items ADD CONSTRAINT order_items_quantity_positive CHECK (quantity > 0);
