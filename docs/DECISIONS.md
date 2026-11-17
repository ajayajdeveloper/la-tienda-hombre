# Decision Log

Every significant choice in v2: what was decided, why, what was rejected, and where to find it in the code.
Each entry is short enough to say out loud in an interview.

**Format:** each entry gives the **Decision**, **Why**, **Rejected** (alternatives considered), **Trade-off**
(what it costs, and when to revisit) and **Code** (where it lives).

---

## A. Scope and process

### A1. Build on v1 instead of rewriting from scratch
- **Decision:** Keep v1's stack and code, and evolve it. v1 stays on `main`; v2 is on the `v2` branch.
- **Why:** v1's core was right: raw SQL, a transactional checkout, a Redux cart. A rewrite would throw away
  working, tested code you wrote by hand, and v1 next to v2 is a useful before/after for interviews.
- **Rejected:** A fresh scaffold (Next.js, Prisma, and so on). It would change three things at once, and you'd
  learn the framework instead of the fundamentals.
- **Code:** `git diff main..v2`

### A2. Cut auth, payments, admin, membership, videos and the AI assistant
- **Decision:** Orders are cash on delivery, the wishlist is per device, and there are no accounts.
- **Why:** Each of these is a whole subsystem (an OAuth/session store, a payment gateway with webhooks, a CMS,
  an LLM). Together they would double the code without teaching more React, Redux or SQL, which is the
  interview gap. Cash on delivery is also the most common payment method in Indian e-commerce, so it's realistic.
- **Trade-off:** Wishlists don't follow you across devices. Orders are protected only by an unguessable URL (see D3).
- **Revisit:** Auth is the natural v3. It unlocks order history and a wishlist synced to the server.

### A3. Every phase must leave the app working, proven by evidence
- **Decision:** No phase counts as done until something *executes* and shows it works: tests, a real browser
  run, or a load test.
- **Why:** "It compiles" and "it looks right in the code" both missed real bugs in this build (see AI-WORKFLOW.md).
- **Code:** `apps/api/test/`, `apps/web/src/**/*.test.js`, `scripts/loadtest.js`

---

## B. Database

### B1. Numbered SQL migrations, tracked in `schema_migrations`, instead of one `schema.sql`
- **Decision:** `db/migrations/001_init.sql`, `002_…`, `003_…`. Each runs once, inside a transaction, and is
  recorded by filename.
- **Why:** v1's `schema.sql` used `CREATE TABLE IF NOT EXISTS`, so it could *create* tables but never *change* them.
  Production databases hold data you can't drop and recreate; changes must be applied as steps.
- **Rejected:** An ORM migration tool (Knex, Prisma). That's a dependency plus a DSL to learn, for about 50 lines
  of runner code. Writing the runner yourself also shows you understand how such tools work.
- **Code:** `apps/api/src/db/migrate.js`

### B2. Applied migrations are never edited; changes go in a new file
- **Decision:** The idempotency key went into `003_order_idempotency.sql`, not into `002`.
- **Why:** `002` had already run on the dev database. Editing it would change nothing there: the runner skips
  it by name. The dev database and a fresh database would then silently differ.
- **Code:** `apps/api/src/db/migrations/003_order_idempotency.sql`

### B3. Migrations take a Postgres advisory lock
- **Decision:** `SELECT pg_advisory_lock(<constant>)` around the whole migration run.
- **Why:** The API container runs migrations on boot. With 2+ replicas starting together, both would try to
  apply the same migration. The lock makes them take turns; the second sees the work is already done.
- **Rejected:** A separate "migrate job" before deploying. That's better at scale, but it's one more moving part
  for a single-server app.
- **Code:** `migrate.js` (`LOCK_KEY`)

### B4. Each migration runs inside a transaction
- **Why:** Postgres supports transactional DDL. If line 40 of a migration fails, lines 1–39 roll back, so a
  migration never leaves the schema half-applied. (MySQL can't do this, which is a good interview point.)

### B5. `002` was written to work on both an empty database and a v1 database with data
- **Decision:** New `NOT NULL` columns get defaults. Existing rows are backfilled *before* adding the constraints
  that depend on them (`UPDATE orders SET subtotal_cents = total_cents`, then `ADD CONSTRAINT …`).
- **Why:** That's how real migrations must behave. Verified by running it on your v1 database (7 orders), after
  a `pg_dump` backup in `backups/`.

### B6. Subcategories through a self-referencing `parent_id`
- **Decision:** `categories.parent_id REFERENCES categories(id)`. Listing by a parent uses a recursive CTE.
- **Why:** One table holds any depth of tree. `WITH RECURSIVE` makes "Shirts" include every descendant
  without hard-coding the depth.
- **Rejected:** A separate `subcategories` table (fixes the depth at 2). Materialized path / ltree (faster for huge
  trees, but overkill for 20 rows).
- **Code:** `services/productQuery.js` (`WITH RECURSIVE tree`)

### B7. Collections are a many-to-many join table, not another category level
- **Why:** "Office Ready" contains shirts *and* trousers. Occasions cut across the category tree, and a product
  can be in several. That's the textbook case for a join table.
- **Code:** `collections`, `product_collections`

### B8. Denormalised counters: `sold_count`, `rating_sum`, `rating_count` on `products`
- **Decision:** Keep running totals on the product row, updated **in the same transaction** as the order or
  review that changes them.
- **Why:** "Sort by popularity" and "sort by rating" become a plain `ORDER BY` on one table. The alternative is
  aggregating every order and review row on every listing request.
- **Rejected:** Computing them on read (correct but slow at scale). A materialized view (needs refresh scheduling).
- **Trade-off:** Writes do a little more work, and the counters must never be updated outside the transaction.
  Storing `rating_sum` rather than an average means no rounding drift: average = sum / count, computed exactly.
- **Code:** `services/orders.js` (sold_count `UPDATE`), `routes/products.js` (review `POST`)

### B9. Full-text search with a generated `tsvector` column and a GIN index
- **Decision:** `search_vector tsvector GENERATED ALWAYS AS (...) STORED`, weighted name (A) > fabric/fit (B) >
  description (C). Queries use prefix matching (`linen:* & shirt:*`).
- **Why:** Postgres recomputes a GENERATED column on every write, so the index can never go stale. The GIN index
  makes the `@@` match fast. Prefix matching makes typeahead work ("lin" finds "linen"). Weights make a match in
  the name rank above a match in the description.
- **Rejected:** `ILIKE '%term%'` (no ranking, no stemming, a full scan). Elasticsearch or Algolia (a whole extra
  service for 36 products).
- **Revisit:** Typo tolerance ("lenin" → linen) needs `pg_trgm`.
- **Code:** `002_catalog_v2.sql`, `productQuery.js` (`toPrefixTsQuery`)

### B10. `CHECK` constraints as the last line of defence
- **Decision:** `stock_quantity >= 0`, `total = subtotal - discount + shipping`, `rating BETWEEN 1 AND 5`,
  valid badge, status and payment values, `compare_at_price >= price`, and others.
- **Why:** Application code has bugs; constraints don't depend on it. Even a broken code path cannot oversell or
  store an inconsistent total. The database refuses.
- **Code:** `002_catalog_v2.sql`

### B11. Orders snapshot what was bought (name, size, colour, unit price)
- **Why:** If a product is renamed, repriced or deleted next month, last month's order must still show what the
  customer actually paid for. A test proves it: rename the product, and the order still shows the old name.
- **Code:** `order_items.product_name/size/color`, `orders.test.js` ("snapshot line items")

### B12. Delivery estimates by pincode prefix (longest match), not one row per pincode
- **Decision:** `delivery_zones(prefix, region, days, cod_available)`. A lookup takes the longest prefix that
  matches, so `560` (Bengaluru, 1 day) beats `5` (South India, 3 days).
- **Why:** India has about 19,000 pincodes. 18 prefix rows cover every one with realistic estimates. It's the
  same idea as IP routing tables.
- **Code:** `services/delivery.js`

### B13. Money stays integer paise; the column names keep the `_cents` suffix
- **Why:** Integer minor units avoid floating-point errors (0.1 + 0.2 ≠ 0.3). Renaming every column to `_paise`
  would churn the whole schema for no behavioural gain. "Cents" here means "minor currency unit". Formatting to
  ₹ happens only at display time (`Intl.NumberFormat('en-IN')`).

---

## C. API design

### C1. Express 5 instead of Express 4
- **Why:** In Express 4, an error thrown inside an `async` handler is an **unhandled promise rejection**. One
  failed query could crash the whole process for everyone. Express 5 forwards rejected promises to the error
  middleware. This was the most serious production risk in v1.
- **Rejected:** Wrapping every handler in `asyncHandler()` (easy to forget one). Fastify (better, but a framework switch).
- **Code:** `app.js`

### C2. `app.js` builds the app; `server.js` starts it
- **Why:** Tests import `createApp()` and give it to supertest, which needs no open port and has no port clashes.
  It also keeps process concerns (listen, signals) out of the request-handling code.

### C3. Configuration validated with zod at boot
- **Why:** A missing `DATABASE_URL` should stop the app at deploy time with a clear message, not on the first
  checkout three hours later. All `process.env` access is in one file.
- **Code:** `config.js`

### C4. A central error handler and an `HttpError` class
- **Decision:** Routes `throw badRequest()`, `conflict()` or `notFound()`. One middleware turns them into JSON. Any
  other error is treated as a bug: a 500 with a generic message, and the stack is logged but never sent to the client.
- **Why:** Consistent error shapes for the frontend, and no leaking of SQL or stack traces.
- **Code:** `lib/httpError.js`, `middleware/errorHandler.js`

### C5. Thin routes, services for complex logic, pure functions for business rules
- **Decision:** Routes = validate input, call a service, respond. The order logic is in `services/orders.js`.
  Pricing rules are pure functions in `lib/pricing.js` (no database, no Express).
- **Why:** The pricing rules are shared by the quote endpoint, the order transaction and the unit tests: one
  implementation, tested without a database.
- **Rejected:** A full controller/service/repository layering. That's ceremony this size doesn't need.

### C6. Every user value is a bound parameter; sort keys come from a whitelist
- **Decision:** The dynamic listing query pushes each value into `params` and references it as `$n`. Only
  fragments written in the code are concatenated into the SQL. `?sort=` must match a key in `SORTS`.
- **Why:** This is what makes dynamic SQL injection-proof. A test sends `shirt'; DROP TABLE products; --` as the
  search term and checks that the products table still exists.
- **Code:** `productQuery.js` (`buildFilters`), `products.test.js`

### C7. Facet counts exclude their own filter
- **Decision:** Size counts are computed with every filter *except* size. Same for colour and price.
- **Why:** Otherwise selecting "M" would make every other size show 0 and you couldn't add "L". This is how
  faceted search works on every major store.
- **Code:** `buildFilters(filters, { except })`

### C8. Size and colour filters match on the *same, in-stock* variant
- **Why:** "M + Navy" must mean "a Navy M you can buy", not "has an M in some colour and Navy in some size".
  The test checks this row by row against the database.

### C9. Paginate first, then load images, colours and stock (the `page` CTE)
- **Why:** The LATERAL subqueries for card data then run for 24 rows, not for every product that matched.
  Ordering ties are broken by `p.id`, so pages never overlap. (Postgres doesn't guarantee a stable order for ties.)
- **Rejected:** Keyset (cursor) pagination. It's better for infinite feeds with millions of rows, but it can't
  jump to page N and complicates multi-column sorts.

### C10. Plain offset pagination with "Load more"
- **Why:** The catalogue is small; the URL holds `?page=3`, so Back restores everything you had loaded.

### C11. `POST /api/orders/quote`: one pricing path for cart, checkout and order
- **Decision:** The cart and checkout pages show totals computed by the server from current prices, stock and
  coupon rules, not from the snapshot in localStorage.
- **Why:** The cart snapshot can be days old. Without the quote, the shopper could see ₹1,499 and be charged
  ₹1,299 (or the reverse). The quote also replaced the separate `/coupons/validate` endpoint, leaving one way
  to price a cart instead of two.
- **Code:** `services/orders.js` (`quoteOrder`), `lib/useCartQuote.js`

### C12. Short-lived `Cache-Control` on catalogue reads
- **Decision:** 30s for listings and products, 5 min for categories, collections and coupons, `no-store` for orders.
- **Why:** Repeat views during a browsing session come from the browser cache; Express's ETag turns
  revalidation into a small 304. Personal data is never cached.

### C13. Rate limiting only on writes
- **Decision:** 20 orders / 15 min / IP; 30 reviews or notify-me requests / 15 min / IP. In memory.
- **Why:** Reads are cheap and cached. Writes can be spammed. In-memory is fine for one API instance.
- **Revisit:** With several instances, move the counters to Redis, or each instance allows the full limit.
- **Code:** `middleware/rateLimits.js`

### C14. Health check pings the database
- **Why:** "The process is up" isn't the same as "the app works". Docker and other platforms route traffic
  based on this check, so it should fail if the database is unreachable.

### C15. Graceful shutdown
- **Decision:** On SIGTERM: stop accepting connections, finish in-flight requests, close the pool, exit, with
  a 10s safety timeout.
- **Why:** On every deploy, an order that's halfway through its transaction should complete, not be cut off.

---

## D. Checkout correctness (the interview centrepiece)

### D1. Lock variant rows with one query, `ORDER BY id`, to prevent deadlocks
- **Decision:** `SELECT … WHERE v.id = ANY($1) ORDER BY v.id FOR UPDATE OF v`.
- **Why:** If order A locks variants (5, 9) and order B locks (9, 5), each can hold one lock and wait forever for
  the other. Postgres detects the cycle and kills one, which shows up as a 500. When every transaction locks in
  ascending id order, a cycle can't form.
- **Evidence:** A mutation test. With v1's approach (one lock per item, in the order the client sent them),
  **18 of 20** concurrent opposite-order checkouts failed with 500s. With the fix, **20 of 20** succeeded.
- **`FOR UPDATE OF v`:** locks only the variant rows, not the joined product rows. Otherwise every order for the
  same product would queue behind each other, and so would review writes.
- **Code:** `services/orders.js`, `orders.test.js` ("does not deadlock")

### D2. Merge duplicate lines before the stock check
- **Why:** v1 checked each line on its own: two lines of quantity 1 for a variant with stock 1 both passed. v2
  sums them first. (The new `CHECK stock >= 0` would have caught it anyway, as a 500 rather than a clean 409.)

### D3. Public order IDs are random UUIDs
- **Why:** `/orders/41` invites trying `/orders/42` and reading a stranger's address (this is called IDOR). A
  random UUID can't be guessed. The internal serial `id` is never sent to the client, and a test asserts that.
- **Trade-off:** Anyone *with* the link can see the order. That's acceptable without accounts; a real store adds
  auth or signed links.

### D4. Idempotency keys on `POST /api/orders`
- **Decision:** The browser sends an `Idempotency-Key` header (a UUID created once per checkout visit). A
  `UNIQUE` column stores it. If the key repeats, the original order is returned with status 200.
- **Why:** A double-click, or a retry after a timeout, must not charge twice. The race (two identical requests at
  the same instant) is handled by the database: the second `INSERT` hits the unique constraint, its transaction
  rolls back, and it returns the winner's order.
- **Evidence:** Tests send a retry and a truly concurrent pair. Exactly one order exists, and stock drops by 1.
- **Same-key requests take turns (fix from the independent review):** a retry that arrives *while the original is
  still running* used to wait on the stock row lock, then see the stock the original had just used, and fail with
  409, even though the order was placed. Now each transaction first takes
  `pg_advisory_xact_lock(hashtextextended(key, 0))`, so copies with the same key run one at a time. The second
  finds the committed order and returns it. A test sends 8 copies × 5 rounds for the last unit. Without the lock
  it failed (`409,409,409,201,…`); with it, it passes.
- **One key per cart contents, not per page visit:** if the response is lost and the shopper then edits the
  cart, the new cart is a different order and gets a new key. Otherwise they would get the old order back.
- **Code:** `services/orders.js`, `003_order_idempotency.sql`, `Checkout.jsx` (`newIdempotencyKey`)

### D5. Report all stock shortfalls at once, as data
- **Why:** If 3 lines are short, the shopper fixes all 3 in one go instead of hitting 3 errors in a row. The
  409 body lists `requested` and `available` for each line, and the cart offers "Update my bag".

### D6. Lock the coupon row too
- **Why:** With a usage limit, two shoppers redeeming the last use at the same moment must not both succeed.
  The same lost-update problem as stock, with the same fix.

### D7. Bulk writes with `unnest()`
- **Why:** Inserting N order lines and decrementing N stocks takes one round trip each, not N. Arrays are passed
  as parameters, so it's as injection-safe as single-row queries.

### D9. Price guard: the browser sends the total it showed (`expectedTotalCents`)
- **Why (from the review):** the server always charges current prices, which is correct. But if a price changed
  between the quote and the click, the shopper paid an amount they never saw. Now a mismatch returns
  409 `priceChanged`, and the page refetches the quote and shows the new total. The cart and checkout lines also
  show the server's price per line, not the snapshot from when the item was added.

### D10. Business dates are calculated in IST
- **Why (from the review):** the estimate used the server's local time and then took the date from
  `toISOString()` (UTC). On a UTC cloud server, an order placed at 01:00 IST would count from the day before.
  Now "today" is taken in `Asia/Kolkata`, then pure calendar arithmetic is applied. Unit-tested at that exact edge.

### D11. A coupon that stops qualifying blocks checkout, with a way out
- **Why (from the review):** the quote treated an invalid coupon as information, but placing the order treated
  it as an error, so the button stayed enabled and every submit failed. Checkout now shows the reason, disables
  "Place order", and offers "Remove code". The server stays strict: it will not quietly drop a discount the
  shopper expected.

### D8. Free shipping is judged on the amount *after* discount
- **Why:** That's the business rule most stores use. Without it, a coupon can push a cart below the threshold
  but still get free shipping. It's covered by a unit test with exact numbers.
- **Code:** `lib/pricing.js` (`computeTotals`)

---

## E. Frontend architecture

### E1. RTK Query for server data; slices only for client state
- **Decision:** Everything that lives in Postgres (products, categories, reviews, quote, orders) comes through
  RTK Query. Redux slices hold only what exists in the browser: cart, wishlist, recently viewed, open overlays.
- **Why:** v1 hand-wrote `useEffect` + `useState` + a cancelled flag for every fetch. RTK Query gives caching
  keyed by arguments, shared requests (three components asking for categories make one request), loading and
  error states, and refetch-on-invalidate. Posting a review invalidates `Reviews` and `Product`, so the rating
  updates on its own.
- **Rejected:** React Query (equally good, but you're learning Redux, and RTK Query is built into RTK). Plain
  `useEffect` (v1, works, but you rebuild a cache by hand).
- **Interview line:** "Server state and client state are different problems. Server state is a cache of someone
  else's data. Client state is yours."
- **Code:** `store/apiSlice.js`

### E1b. Product page renders `currentData`, not `data`
- **Why (from the review):** while product B loads, RTK Query's `data` still holds product A. Rendering it showed
  A's buy box under B's URL, and A could be added to the bag. `currentData` is empty until B's own response
  arrives, so the page shows a skeleton instead. Verified frame by frame in Chrome.

### E2. Filters live in the URL
- **Decision:** `?sizes=M,L&colors=Navy&sort=price_asc&page=2`. The listing reads them with `useSearchParams`.
- **Why:** Shareable links, a working Back button, refresh keeps your filters, and no duplicated state to sync.
  The URL *is* the state.
- **Price buckets don't share boundaries** (Under ₹1,000 / ₹1,000–1,499 / …): the API compares inclusively,
  and the first version listed a ₹1,499 item in two buckets (found in review; unit-tested now).
- **Code:** `lib/filters.js`, `pages/Listing.jsx`

### E3. "Load more" = one query per page
- **Decision:** Page 1 and each extra page are separate `useGetProductsQuery` calls, rendered in sequence.
- **Why:** Each page is its own cache entry, so Back from a product restores all loaded pages instantly. There's
  no hand-written array merging.

### E4. Listener middleware for side effects (persistence, opening the cart drawer)
- **Why:** Reducers must be pure, so no localStorage in them. v1 used `store.subscribe`, which runs on *every*
  action, including every API loading-state change. A listener runs only for the actions it names. "Add to cart
  opens the drawer" is also a listener, so the product page doesn't need to know a drawer exists.
- **Code:** `store/persistence.js`

### E5. A versioned localStorage key, plus sync across tabs
- **Why:** `lth:cart:v2`: if the cart's shape changes, bump the version and old carts are ignored instead of
  causing `NaN` (v1 hit exactly this). The `storage` event keeps several open tabs in sync.

### E6. The wishlist and recently viewed store IDs, not product snapshots
- **Why:** Prices and stock change. IDs are fetched fresh with `GET /products?ids=…`, so a saved item never shows
  a stale price. The cart is the exception: it needs an instant snapshot, and the quote corrects it (C11).

### E7. `createBrowserRouter` (data router) and route-level code splitting
- **Why:** `ScrollRestoration` (scroll back to where you were on Back) only works with the data router. Each page
  is a `lazy()` chunk, so the homepage doesn't download the checkout code. The build shows ~110 KB gzipped for the
  shared bundle plus 1–7 KB per page.

### E8. Plain CSS with design tokens and CSS Modules
- **Decision:** `tokens.css` holds every colour, size and spacing variable; each component has a `*.module.css`.
- **Why:** Tokens make the look consistent, and a rebrand is one file. CSS Modules scope class names per
  component (no collisions) with zero dependencies, since Vite supports them natively. Buttons and form fields
  stay global because they're used everywhere.
- **Rejected:** Tailwind (a new vocabulary to learn; you asked to learn React and Redux, not a CSS framework).
  CSS-in-JS (runtime cost, and a library).

### E9. An error boundary per page; a skeleton per loading state
- **Why:** A render bug in one page shows a fallback instead of a blank white screen, and navigating away
  clears it. Skeletons hold the layout steady while data loads.

### E10. Accessibility basics built in
- Native `<details>` for accordions (keyboard and screen reader support for free), `role="radiogroup"` for
  sizes and colours, `aria-live` for toasts and the promo bar, focus moved into drawers and back to the trigger
  when they close, Escape closes overlays, `inert` on hidden overlays, a skip link, `prefers-reduced-motion`
  respected.

### E11. Generated SVG product art instead of photos
- **Why:** There are no real product photos, and copying the reference sites' images would be both wrong and a
  copyright problem. A script draws flat illustrations for each silhouette, pattern and colour: 190 files at
  2–4 KB each, sharp at any screen density.
- **Code:** `apps/api/scripts/generate-images.js`

### E12. Business constants come from the API
- **Decision:** `GET /api/settings` returns the free-shipping threshold, shipping fee and quantity cap.
- **Why:** The progress bar ("Add ₹240 more for free shipping") can't drift from the rule the server charges by.

---

## F. Deployment and operations

### F1. One origin: nginx serves the app and proxies `/api`
- **Why:** The browser never makes a cross-origin request, so there's no CORS in production and no
  `VITE_API_URL` to get wrong. The dev server mirrors this with Vite's proxy, so dev and prod behave the same.
- **Code:** `apps/web/nginx.conf.template`, `vite.config.js`

### F2. Multi-stage Dockerfiles, non-root user, `npm ci`
- **Why:** The final web image is nginx plus ~1 MB of files (79 MB in total, no Node). The API image has
  production dependencies only. `npm ci` installs exactly what the lockfile says. Running as `node`, not root,
  limits the damage if the process is compromised.

### F3. Hashed assets cached forever; `index.html` never cached
- **Why:** Vite puts a content hash in each filename, so a changed file always gets a new name and `immutable`
  caching is safe. `index.html` is `no-cache`, so a new deploy is picked up on the next page load.

### F4. nginx keeps reusable connections to the API; Node's idle timeout is longer than nginx's
- **Decision:** `upstream { keepalive 64; }` + `proxy_set_header Connection ""`. In Node:
  `server.keepAliveTimeout = 65s` (longer than nginx's 30s).
- **Why (found by the load test):** Without upstream keep-alive, nginx opened a new TCP connection per request.
  At about 2,600 requests per second the container ran out of local ports, and **~100,000 requests failed with
  502** (`connect() failed (99: Address not available)`). With keep-alive: 0 errors.
  The Node timeout prevents the rarer race where Node closes an idle socket just as nginx reuses it.
- **Lesson:** Defaults that are fine in development can fail under load. Only a load test finds this.

### F5. Migrations on boot; seeding is a separate, guarded step
- **Why:** Migrations must run on every deploy, and the advisory lock makes that safe. Seeding wipes data, so
  it's never automatic, and it **refuses to run if any orders exist** unless you pass `--force`.

### F6. Only nginx is published; the API and database stay on the private network
- **Why:** That's the smallest possible attack surface, and the database is never reachable from the internet.

### F7. Deploy target: one VPS with Docker Compose
- **Why:** The exact stack that was load-tested locally runs unchanged. For 50 users, one small server has more
  than 10× headroom (see DEPLOYMENT.md). Managed platforms are a valid alternative, but they weren't tested in
  this build, so they're described rather than scripted.

---

## G. Testing

### G1. API tests run against a real Postgres database, not mocks
- **Why:** The bugs that matter (deadlocks, races, constraint violations, SQL errors) only happen in a real
  database. A separate `hombre_test` database is created automatically and re-seeded for each test file.

### G2. Concurrency is tested with real concurrent requests
- **Why:** "Two orders for the last item" is tested by actually sending two at once. And the deadlock test was
  proven to fail without the fix (mutation testing, D1). A test that can't fail proves nothing.

### G3. Frontend unit tests cover reducers, selectors and URL helpers
- **Why:** That's where the logic is, and pure functions need no DOM or mocks. UI behaviour was verified by
  driving real Chrome through every flow on desktop and phone, with screenshots and console-error capture.
- **Code:** `scripts/smoke.mjs` (`npm run smoke`) drives real Chrome through every flow.
- **Revisit:** Move to Playwright Test with assertions per step, and run it in CI.
