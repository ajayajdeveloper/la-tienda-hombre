# La Tienda Hombre v2: Roadmap

v1 (on `main`) is a working store: a catalog, a product page, a Redux cart, and a checkout that runs inside a
transaction. v2 turns it into a store that looks and behaves like the Indian menswear sites in the
[Website UI Pattern Catalog](https://claude.ai/artifact/4tiHeLRGhZPAnLs1DtQXqq). v2 also makes it deployable.

v2 is built on the `v2` branch. `main` keeps v1 exactly as it was written by hand, for comparison.

**Status (2026-11-17):** phases 0–7 are done and verified: 62 tests pass (41 API, 21 web), the browser smoke test passes
on dev and on the production stack, and the load-test numbers are in `DEPLOYMENT.md`. A deploy to a real server
(which needs a server and a domain) hasn't been done.

**How to read the docs**

| File | What it answers |
|---|---|
| `docs/ROADMAP-v2.md` (this file) | What gets built, in what order, and what counts as done |
| `docs/DECISIONS.md` | *Why* each choice was made, with the alternatives that were rejected |
| `docs/ARCHITECTURE.md` | How the pieces fit together: request flow, folder layout, data model |
| `docs/AI-WORKFLOW.md` | How a developer works with an AI assistant to build a feature from scratch |
| `docs/DEPLOYMENT.md` | How to run it in production, and the capacity numbers for ~50 users |

---

## Scope

**In scope:** the Priority 1 and 2 patterns from the catalog, a few Priority 3 ones that cost little, and a
deployment that works.

**Out of scope:** user accounts and login, online payments (orders are cash on delivery), an admin panel,
membership pricing, shoppable videos, the AI style assistant. Each one needs a separate subsystem: auth, a
payment gateway, a CMS, or an LLM. They would double the size of the project without teaching anything new
about React, Redux or SQL.

## Phases

Each phase leaves the app working. Each phase ends with a check that proves it works, not just that it
compiles.

### Phase 0: Plan and docs
- This roadmap, the decision log, the AI-workflow guide.
- **Done when:** the scope and order are written down before any code is written.

### Phase 1: Backend foundation (make it safe to run in production)
- Split `app.js` (builds the Express app) from `server.js` (starts it listening), so tests can import the app
  without opening a port.
- Upgrade to Express 5, so errors thrown in `async` handlers reach the error middleware instead of crashing the
  process.
- Add an env config module checked with zod: the app refuses to boot with a missing `DATABASE_URL`.
- Add a central error handler, an `HttpError` class, a 404 handler, and request logging.
- Add helmet, compression, and rate limiting on write endpoints.
- Add graceful shutdown that drains the database pool on SIGTERM.
- Add a health check that also checks the database.
- **Done when:** a route that throws returns a 500 JSON response and the server stays up.

### Phase 2: Data model v2 + migrations
- Replace "run schema.sql" with numbered migrations tracked in a `schema_migrations` table. Migrations run inside
  a transaction and take an advisory lock, so two app instances can't run them at once.
- `001_init.sql` = the v1 schema exactly. `002_catalog_v2.sql` adds:
  - subcategories (`categories.parent_id`)
  - MRP (`compare_at_price_cents`), badges, fit, fabric, a highlights JSON column
  - `product_images` (several images per colour), colour hex codes on variants
  - `collections` (occasion-based groups such as "Office" or "Linen days")
  - `coupons`, `pincodes`, `reviews`, `stock_notifications`
  - order snapshot fields: name, size and colour at the time of purchase; subtotal, discount, shipping;
    a public UUID
  - full-text search (a generated `tsvector` column with a GIN index)
- The seed script creates about 30 products across 4 top-level categories and 15 subcategories, with
  deliberate sold-out and low-stock sizes. It refuses to run when `NODE_ENV=production`.
- **Done when:** `npm run db:migrate` on an empty database and on a v1 database both end in the same schema.

### Phase 3: API v2
| Endpoint | Purpose |
|---|---|
| `GET /api/categories` | Category tree with product counts (feeds the mega menu) |
| `GET /api/collections`, `/:slug` | Occasion collections |
| `GET /api/products` | Listing: category (including subcategories), collection, `q`, size, colour, price range, sort, page; returns items, total and facet counts |
| `GET /api/products/:slug` | Product page: images, variants, highlights, rating summary |
| `GET /api/products/:slug/similar` | Same subcategory, excluding this product |
| `GET /api/products/:slug/reviews`, `POST` | Reviews and the rating breakdown |
| `GET /api/search/suggest?q=` | Live search suggestions (top 6) |
| `GET /api/coupons`, `POST /api/coupons/validate` | Offer cards; check a code against a subtotal |
| `GET /api/pincodes/:pincode` | Delivery estimate and whether cash on delivery is available |
| `POST /api/orders` | Checkout with coupon, shipping rules, pincode check, stock locks in a fixed order (prevents deadlocks) |
| `GET /api/orders/:publicId` | Confirmation page that survives a refresh |
| `POST /api/stock-notifications` | "Notify me" for sold-out sizes |
- **Done when:** integration tests pass against a real Postgres database. They cover the filters, checkout,
  coupons, the oversell race and the deadlock case.

### Phase 4: Frontend foundation
- `VITE_API_URL` env support, plus a Vite dev proxy so dev runs without CORS.
- A design system: CSS custom properties for colour, type, spacing and radius, and CSS Modules per component.
- RTK Query for server data (caching, loading states, de-duplicated requests). Redux slices for cart, wishlist,
  recently viewed, and UI state (drawers and overlays). A listener middleware saves state to localStorage.
- Route-level code splitting, an error boundary, a 404 page, scroll restoration.
- Fix the `Checkout.jsx` / `checkout.jsx` filename case bug, which breaks the build on Linux.
- **Done when:** the old pages run on the new foundation with no visual regressions.

### Phase 5: Storefront UI (the catalog patterns)
| Area | Patterns |
|---|---|
| Header | Rotating offer bar, sticky header, mega menu with subcategories, search overlay with live suggestions, wishlist and cart badges, mobile drawer |
| Home | Hero slider, category tiles, occasion collections, bestsellers and new-arrivals carousels, USP strip, recently viewed |
| Listing | Subcategory chips, filter sidebar (desktop) and filter sheet (mobile), active-filter chips, sort, "load more", grid density toggle, filters stored in the URL |
| Product card | Second image on hover, NEW/BESTSELLER badge, fit tag, wishlist heart, price + struck-through MRP + % off, rating, colour dots |
| Product page | Gallery with thumbnails, colour swatches, size buttons (sold out / "3 left"), size guide modal, pincode check, offer cards with copy-code, spec grid, info accordions, reviews with rating breakdown, similar products, "Notify me" |
| Cart | Slide-out cart drawer with a free-shipping progress bar, cart page, coupon field |
| Checkout | Address + phone + pincode, cash on delivery, price breakdown, confirmation at `/orders/:publicId` |
| Footer | Link columns, trust badges, newsletter field (UI only) |
- **Done when:** every flow is clicked through in a real browser at desktop and phone widths.

### Phase 6: Tests and quality
- API: `node:test` + supertest against a separate `hombre_test` database.
- Web: Vitest for slices, selectors and pure helpers.
- **Done when:** `npm test` passes from a clean checkout.

### Phase 7: Deployment
- Dockerfiles: the API on `node:22-alpine`; the web build served by nginx, which also proxies `/api`, so the app
  runs on one origin with no CORS.
- `docker-compose.prod.yml` runs the whole production stack locally on one port.
- Migrations run on boot (safe because of the advisory lock). The seed is a separate, explicit step.
- A `render.yaml` blueprint for one-click cloud deploys, plus a VPS option.
- A load test with autocannon against the local production stack, to show it handles 50 concurrent users with
  room to spare.
- **Done when:** `docker compose -f docker-compose.prod.yml up` serves a working store at http://localhost:8080
  and the load test numbers are in `DEPLOYMENT.md`.
