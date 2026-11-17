# Architecture

A React single-page app and an Express JSON API in front of Postgres. In production, nginx serves the built app
and proxies `/api`, so the browser talks to a single origin.

## Request flow

```
                         ┌──────────────────────────── one origin (:8080) ───────────────────────────┐
 Browser                 │  nginx                                                                    │
 ─────────               │  ├─ /assets/*  → hashed JS/CSS, cached 1 year (immutable)                 │
 React + Redux           │  ├─ /images/*  → product SVGs, cached 1 day                               │
 RTK Query cache  ──────▶│  ├─ /api/*     → keep-alive pool ──▶ Express (Node 22)                    │
 localStorage            │  └─ /*         → index.html (no-cache) → React Router renders the page    │
 (cart, wishlist)        └──────────────────────────────────────────┬────────────────────────────────┘
                                                                    │ pg.Pool (10 connections)
                                                                    ▼
                                                            Postgres 16
                                                     (private network only)
```

In development the same shape runs on two ports: Vite on `:5174` proxies `/api` to Express on `:4000`.
The browser still sees one origin, so dev and prod behave the same.

## Life of a checkout

```
Checkout.jsx                         POST /api/orders  (Idempotency-Key: <uuid>)
  │ form + cart lines (no prices)       │
  ▼                                     ▼
RTK Query mutation ───────────▶ routes/orders.js ── zod validates body + key
                                        │
                                        ▼
                               services/orders.js  placeOrder()
                               1. key seen before? → return that order (200)
                               2. merge duplicate lines
                               3. pincode → delivery zone (COD allowed?)
                               4. BEGIN
                               5.   SELECT variants … ORDER BY id FOR UPDATE OF v   ← locks, no deadlocks
                               6.   all shortfalls? → 409 with details
                               7.   prices from DB; coupon row FOR UPDATE; lib/pricing totals
                               8.   INSERT order; INSERT lines via unnest(); UPDATE stock; UPDATE sold_count
                               9. COMMIT  (or ROLLBACK on any error; UNIQUE(key) race → return winner)
                                        │
  navigate(/orders/<public uuid>) ◀─────┘ 201 + order (no internal id)
  then dispatch(clearCart())
```

## Where state lives

| State | Lives in | Why there |
|---|---|---|
| Products, categories, reviews, orders | Postgres → RTK Query cache | Server data; the browser only borrows a copy |
| Cart prices and totals shown to the shopper | `POST /orders/quote` (server) | One set of pricing rules for display and charging |
| Cart lines, coupon code | Redux `cart` slice → localStorage | Exists before the server knows about it; must survive a refresh |
| Wishlist, recently viewed | Redux slices (IDs only) → localStorage | Per device, no accounts; card data fetched fresh |
| Filters, sort, page | The URL | Shareable, works with Back, survives refresh |
| Open drawer or overlay, toast | Redux `ui` slice | Opened in one place, rendered in another |
| Form inputs, selected size or colour | Component `useState` (colour in the URL) | Local to one component |

## Folder layout

```
apps/api/
  src/
    app.js                 builds the Express app (middleware order, routes)
    server.js              listen, keep-alive timeouts, graceful shutdown
    config.js              env vars validated with zod
    db/
      pool.js              pg.Pool + withTransaction()
      migrate.js           numbered migrations, advisory lock
      migrations/          001_init, 002_catalog_v2, 003_order_idempotency
      seed.js, seed-data.js
    lib/                   httpError, validate (zod), pricing (pure rules)
    middleware/            errorHandler, requestLogger, rateLimits, cache
    services/              productQuery (dynamic SQL + facets), orders, delivery
    routes/                one file per resource, thin
  scripts/generate-images.js
  test/                    node:test + supertest against a real Postgres

apps/web/
  src/
    main.jsx, router.jsx   providers, lazy routes
    store/                 apiSlice (RTK Query), cart/wishlist/recent/ui slices, persistence listeners
    lib/                   format, filters (URL ↔ state), hooks, useCartQuote
    styles/                tokens.css (design system), base.css
    components/
      layout/              PromoBar, Header + mega menu, SearchOverlay, MobileNav, CartDrawer, Footer
      product/             ProductCard, ProductGrid, ProductCarousel, Price, Rating, WishlistButton
      listing/             FilterPanel
      pdp/                 Gallery, SizeSelector + SizeGuide, DeliveryCheck, OfferCards, Reviews
      checkout/            OrderSummary
      home/                Hero, HomeSections
      ui/                  Drawer, Modal, Accordion, QuantityStepper, Icon, Feedback (skeleton, toast, error boundary)
    pages/                 Home, Listing, ProductDetail, Cart, Checkout, OrderConfirmation, Wishlist, Help, NotFound
  nginx.conf.template, Dockerfile

scripts/                   loadtest.js (autocannon), smoke.mjs (real Chrome, end to end)
docker-compose.yml         dev Postgres (:5433)
docker-compose.prod.yml    postgres + api + web (nginx) on :8080
```

## Data model

```
categories ─┐ parent_id (self)          collections ──< product_collections >── products
            └──< products >──< product_images (color, url, sort_order)
                     │
                     ├──< product_variants (size, color, color_hex, size_order, sku, stock ≥ 0)
                     │          │
                     │          ├──< order_items >── orders (public_id uuid, idempotency_key unique,
                     │          │     (snapshot:        subtotal − discount + shipping = total,
                     │          │      name/size/color)  coupon_code → coupons, pincode, status)
                     │          └──< stock_notifications (variant_id, email) unique pair
                     └──< reviews (rating 1–5)

coupons (code PK, percent|flat, min_subtotal, max_discount, expiry, usage_limit, times_used)
delivery_zones (prefix PK, region, delivery_days, cod_available)   longest-prefix lookup
schema_migrations (name, applied_at)
```

Products carry denormalised counters (`sold_count`, `rating_sum`, `rating_count`) and a generated
`search_vector` with a GIN index. See DECISIONS.md B8 and B9.

## API surface

| Method | Path | Notes |
|---|---|---|
| GET | `/healthz` | Pings the DB; 503 if unreachable |
| GET | `/api/settings` | Shipping threshold, fee, quantity cap |
| GET | `/api/categories` | Tree with product counts |
| GET | `/api/collections`, `/:slug` | |
| GET | `/api/products` | `category, collection, q, sizes, colors, ids, minPrice, maxPrice, onSale, sort, page, limit` → `{items, total, page, totalPages, sort, facets}` |
| GET | `/api/products/:slug` | Product + images + variants + breadcrumb categories |
| GET | `/api/products/:slug/similar` | 8 cards |
| GET/POST | `/api/products/:slug/reviews` | `page, sort` / create (rate limited) |
| GET | `/api/search/suggest?q=` | 6 products + 4 categories |
| GET | `/api/coupons` | Currently usable offers |
| GET | `/api/delivery/:pincode` | Region, ETA date, COD |
| POST | `/api/orders/quote` | Server-priced cart, shortfalls, coupon result |
| POST | `/api/orders` | `Idempotency-Key` header; 201 new / 200 replay / 409 stock / 400 validation |
| GET | `/api/orders/:publicId` | UUID only |
| POST | `/api/stock-notifications` | Only for sold-out variants; duplicate requests are ignored |

Errors are always `{ "error": "message", "details"?: … }`.
