# La Tienda Hombre — Build Journal

The story of this project from scratch to now, one entry per working session.
Newest entry at the bottom. `/catch-up` reads this file to rebuild context;
`/checkpoint` adds to it at the end of a session.

> Note: the checkboxes in `ROADMAP.md` were never ticked. This journal is the
> real record of what is done.

---

## Ground rules (read these first, every session)

- **This is a learning project, not a "build it for me" project.** It's interview prep:
  4 years of backend experience (Node/Express/Fastify, Mongo/Postgres, queues), and
  the gap to close is React + Redux.
- **Working method (since 2026-11-17): Claude builds, the user reviews.** The user chose
  to "speed up the learning": Claude writes everything, app code included, and records
  every decision and its reasoning in `docs/DECISIONS.md`. The user learns by reviewing.
  (From 2026-08-29 to 2026-11-17 it was the reverse: Claude explained line by line, the
  user typed, and Claude never wrote under `apps/*/src/`. Change modes only when the user
  says so.)
- **Skip the basics the user already knows:** useState, useEffect, useMemo, useRef,
  conditional rendering. Teach only what's new (router, Redux Toolkit, patterns).
- **Commits:** the user is the only author. Never add a Co-Authored-By line.
  Remote is `git@github-personal:ajayajdeveloper/la-tienda-hombre.git`.
- **Reference repo:** `../la-tienda` is a finished, verified implementation. Peek at it
  if stuck. Don't copy from it.

## Locked-in decisions

- Backend: Node + Express, plain JS (ESM), PostgreSQL through raw `pg`. No ORM, on
  purpose (practice for SQL interviews).
- Frontend: React (`.jsx`, no TS) + Vite, react-router (data router), plain CSS with
  design tokens + CSS Modules.
- State (v2): RTK Query for server data; slices for cart, wishlist, recent, ui; filters
  in the URL. Backend on Express 5.
- Money is always integer minor units (paise; columns keep the `_cents` suffix). Currency
  is INR since v2.
- Production: nginx serves the web app and proxies `/api` (one origin), port `8080`.
- Ports: API `4000`, web `5174`, Postgres `5433` (db/user/pass all `hombre`). These are
  different from la-tienda's ports, so both can run at the same time.
- V1 scope: catalog, product detail, cart, checkout that creates a real order.
  No auth, payments or admin (left for v2).

---

## 2026-08-29 — Kickoff, and a reset

- Set up the monorepo (`apps/api`, `apps/web`), npm workspaces, `concurrently`,
  Postgres in docker-compose on port 5433. Wrote `ROADMAP.md` (6 milestones, about 8h).
- **What went wrong:** Claude wrote the whole backend and frontend itself. The user
  objected: *"i am creating project for learning purpose not for show off."*
  Everything was redone in the line-by-line teaching style above.
- The user also asked for **line-by-line teaching, not a big spec**. Handing over one
  large task description to figure out alone is not wanted either.

## 2026-08-30 — Backend + React foundation (Milestones 1–3)

- The user wrote, line by line: the Express skeleton, `db/schema.sql` (5 tables +
  indexes), `db/pool.js`, `db/migrate.js`, `db/seed.js`, `routes/categories.js`,
  and `routes/product.js` (**singular filename**, mounted at `/api/products`).
  Tested against real Postgres.
- Frontend: `main.jsx`, `api.js`, `App.jsx`, `pages/ProductList.jsx`,
  `pages/ProductDetail.jsx`, `index.css`. Tested in a real browser that you can go
  from the grid to a product and back.
- Problems hit:
  - Leftover dev servers that Claude started for testing kept ports 4000/5174 busy.
    Run `lsof -i :4000 -i :5174` before blaming the user's setup.
  - `localhost` and `127.0.0.1`, or the same host on a different port, count as
    different CORS origins. A CORS mismatch error usually means the wrong port,
    not a bug in the code.
  - Code was pasted into the wrong file (ProductDetail code ended up in ProductList.jsx).
    **Always read the file on disk before marking a step as tested.**

## 2026-09-01 — Redux cart (Milestone 4)

- `store/cartSlice.js` (addItem / updateQuantity / removeItem / clearCart),
  `store/store.js` (configureStore + saving to localStorage with `preloadedState` and
  `store.subscribe`), `store/cartSelectors.js` (`createSelector` for the total and
  the item count).
- ProductDetail: picking a variant uses local state, and Add to cart dispatches an
  action. `pages/Cart.jsx` was added, plus a cart-count badge in the header in `App.jsx`.
- Tested in the browser, including that the cart survives a page refresh.
- Problem hit: a duplicate copy of a JSX block sat outside a `.map()` in Cart.jsx. It
  caused a `ReferenceError`, then a `NaN` from old data in localStorage.
- Wrote `STUDY.md`, revision notes up to this milestone (sections 1–8).

## 2026-09-13 — Checkout (Milestones 5–6). V1 is done.

- `routes/orders.js`: `POST /api/orders`, checked with zod. It runs inside one
  transaction: `BEGIN`, then `SELECT ... FOR UPDATE` on each variant, then check and
  lower the stock, then insert `orders` + `order_items`, then `COMMIT`. If anything
  fails it does `ROLLBACK` and returns 409. The server reads the price from its own
  database and ignores any price the client sends.
- **Concurrency test:** two requests sent at the same moment for a variant with
  `stock_quantity=1` gave exactly one 201 and one 409, and stock ended at 0, not -1.
- Frontend: `pages/checkout.jsx` (lowercase filename) is a controlled form. It only
  clears the cart when the order succeeds, then navigates with
  `state: { order, items }`. `pages/OrderConfirmation.jsx` reads
  `useLocation().state`.
- The cart's quantity input now stops at the available stock (`stockQuantity` is
  copied onto the cart item when it's added). Before this, the UI let you go over
  stock. The backend already refused those orders, so it was a UX problem, not a
  correctness bug.
- Known limits: the confirmation page is lost on refresh, and
  `GET /api/orders/:id` was never built (left out on purpose).

## 2026-11-17 — v2: full redesign + features + deployment (Claude-built)

- Working mode changed (see Ground rules). Built on a new `v2` branch; `main` = v1 as typed by hand.
- Inputs: the user's "Website UI Pattern Catalog" doc (115 patterns from Powerlook, Souled
  Store, Veirdo, Snitch, Nobero) + Banana Club. Plan: `docs/ROADMAP-v2.md`.
- Backend: Express 5, zod config, error handler, helmet/compression/rate limits, graceful
  shutdown. Numbered migrations with an advisory lock (001 = v1 schema, 002 catalogue v2,
  003 idempotency). Faceted listing (`services/productQuery.js`), FTS search, reviews,
  coupons, pincode zones, `POST /orders/quote`, hardened `placeOrder` (locks in id order,
  merges duplicate lines, idempotency key, public UUIDs).
- v1 bugs fixed: `checkout.jsx` vs `Checkout.jsx` case (breaks the Linux build), Express 4
  async crash, duplicate lines bypassing the stock check, deadlock-prone lock order
  (a mutation test showed 18/20 failures with v1's order).
- Frontend: rebuilt on RTK Query + CSS Modules; header with mega menu, search overlay, cart
  drawer, listing with URL filters/facets/load more, full product page, server-quoted cart
  and checkout, confirmation at `/orders/:publicId` (survives refresh), wishlist, help, 404.
- Product images are generated SVGs: `npm run images -w apps/api` →
  `apps/web/public/images/products/`.
- Tests: 35 API (real Postgres, `hombre_test`) + 20 web (Vitest), all passing.
  `npm run smoke` (real Chrome, desktop + phone) passes on dev and on the prod stack.
- Deployment: Dockerfiles, `docker-compose.prod.yml` (:8080), `npm run loadtest`. The load
  test found nginx 502s from per-request upstream connections; fixed with keepalive. Under
  small-server limits: listing ~270 req/s, other endpoints 1,000+ req/s, 0 errors.
- Your dev DB was migrated after a backup to `backups/v1-before-migrate.sql` (7 v1 orders),
  then reseeded with the v2 catalogue (the v1 orders are only in that backup now).
- An independent review agent then found 7 bugs (idempotent-retry race, stuck checkout with an
  invalid coupon, price changes charged silently, overlapping price buckets, UTC delivery dates,
  stale product during navigation, int overflow on ids). All fixed with regression tests (now 41 API
  + 21 web). See DECISIONS.md D4, D9–D11, E1b.
- Docs: `README.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/DEPLOYMENT.md`,
  `docs/AI-WORKFLOW.md`. Nothing is committed yet: everything is uncommitted on `v2`.

## 2026-11-17 (later) — Free hosting plan + Neon set up

- Researched ₹0 hosting. Plan: Cloudflare Pages (web + SVG images) + Render free (API) + Neon free
  (Postgres); R2 later for real photos. Rejected Supabase for now (project pauses after ~1 week idle
  and needs a manual restore; 500 MB), Render Postgres (deleted after 30 days), Oracle free VM (idle
  reclaim, capacity issues), Fly/Koyeb (free tiers gone or unclear).
- Neon project created in **AWS ap-southeast-1 (Singapore)** (first attempt was in Ohio; recreated
  while empty). Connection strings are in `apps/api/.env.neon` (gitignored; `.gitignore` now covers
  `.env.*`). `sslmode=verify-full`. Migrated + seeded; demo data is clean (0 orders).
- Use the DIRECT URL for migrations (the advisory lock spans statements; the pooler is transaction
  mode) and the POOLED URL for the API. Scripts: `npm run dev:neon`, `npm run db:migrate:neon`.
- Added `GET /livez` (no DB). The uptime pinger must hit `/livez`, not `/healthz`, or it keeps Neon
  awake 24/7 and burns the 100 free CU-hours.
- Verified: `npm run smoke` passes with the API on Neon, and the orders landed in Neon.
- Gotcha hit: killing only the API process left the old `node --watch` parent alive; a file edit
  restarted it on the local DB and it grabbed port 4000. Kill the whole `npm run dev` tree.

## 2026-11-17 (later) — Committed v2; prepared Vercel deploy

- v2 committed in 5 phase commits (author ajayajdeveloper, no co-author) and pushed: `origin/v2`.
  `main` is still v1 on purpose (hand-typed reference).
- Chose Vercel (Hobby, non-commercial) over Render: Fluid compute avoids the 1-minute cold start, one
  platform for web + API, single region allowed on Hobby → `sin1` next to Neon.
- Code for Vercel: default-exported app in `src/app.js`, `attachDatabasePool` when `VERCEL` is set,
  `apps/api/vercel.json` (sin1), `apps/web/vercel.json` (proxy `/api/*` to the API project + SPA fallback).
  Verified by running the default export with `VERCEL=1` against Neon; not yet deployed (needs the
  user's Vercel account). Steps: `docs/DEPLOYMENT.md` section 3.

## 2026-11-17 (later) — Live on Vercel

- Merged v2 into `main` (PR #1, merge commit keeps the 6 phase commits). v1 is commit `cade696` (no tag yet).
- Live: shop https://la-tienda-hombre-pi1g.vercel.app · API https://la-tienda-hombre.vercel.app
  (function region sin1, Neon Singapore). Smoke test passes against production; Neon reseeded after.
- First API deploy failed with FUNCTION_INVOCATION_FAILED on every route: DATABASE_URL wasn't set, and
  config.js exits on purpose when it's missing. Env vars only apply to NEW deployments → redeploy.
- The API project took the `la-tienda-hombre` name; web rewrite points there. Vercel auto-deploys both
  projects on every push to `main`.

## Open threads / possible next steps

- Optional: tag `cade696` as `v1`; remove the Claude co-author from the old Initial commit (needs a
  history rewrite + force push, only if the user asks).
- Review v2 using the reading order in `docs/AI-WORKFLOW.md` section 8, then do its exercises.
- `STUDY.md` still covers only v1 topics; v2 reasoning is in `docs/DECISIONS.md`.
- v3 ideas: auth (unlocks order history and a synced wishlist), online payments, an admin
  panel, Playwright in CI, "quick add" from product cards.
