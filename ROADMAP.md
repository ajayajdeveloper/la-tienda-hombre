# La Tienda Hombre — Build Roadmap

**Goal:** build a clothing store storefront (product catalog, cart, checkout) in plain JS —
Express + Postgres backend, React + Redux Toolkit frontend — for interview-prep depth,
not a copy-paste build.

**Working method:** Explain + you write + I review. Each milestone is tagged:
- **Fast** — you already know this cold (backend/SQL). Brief explanation, you write it in one pass.
- **Deep** — the actual gap (React/Redux). More Socratic back-and-forth, more iteration expected.

**Budget:** ~8 hours total. No slack — if Milestones 3–4 run long (likely, since that's new
ground), we protect that time by trimming Milestone 6's polish, not the Redux depth.

---

## Milestone 1 — Database schema `Fast` `~1h`

- [ ] Design `products` + `product_variants` tables (size/color/stock per variant)
- [ ] Write `schema.sql`
- [ ] Run it against Postgres (docker-compose, port 5433)
- [ ] Seed a handful of sample products by hand

*(No separate `categories` table for v1 — a plain text column on `products` is enough;
the FK/join practice is better spent on orders later.)*

## Milestone 2 — Products API `Fast` `~1h`

- [ ] Express app skeleton (`index.js`, env config, health check route)
- [ ] `GET /api/products` (list)
- [ ] `GET /api/products/:slug` (detail, includes variants)
- [ ] Verified end-to-end with `curl`

## Milestone 3 — React foundation `Deep` `~2h`

- [ ] Vite + React scaffold (plain `.jsx`, no TS)
- [ ] `react-router` set up
- [ ] Product list page — `useState`/`useEffect` data fetching
- [ ] Product detail page — local component state for size/color selection

## Milestone 4 — Redux cart `Deep` `~2h`

- [ ] Redux Toolkit store setup (`configureStore`, `Provider`)
- [ ] `cartSlice` — `addItem` / `updateQuantity` / `removeItem` / `clearCart`
- [ ] Wire "Add to cart" from the detail page (`useDispatch`)
- [ ] Cart page (`useSelector`, quantity controls, remove)
- [ ] `localStorage` persistence

## Milestone 5 — Orders + checkout API `Fast` `~1h`

- [ ] `orders` + `order_items` schema
- [ ] `POST /api/orders` — transactional, stock validated with `SELECT ... FOR UPDATE`
- [ ] `GET /api/orders/:id`

## Milestone 6 — Checkout UI `Fast` `~1h`

- [ ] Checkout page — controlled form (name/email/address)
- [ ] Order confirmation page
- [ ] Full end-to-end pass: browse → add to cart → checkout → confirmation

---

## Reference

- Reference implementation (don't copy, but okay to peek if stuck): `../la-tienda`
- Ports: API `4000`, web `5174`, Postgres `5433` (db/user/pass: `hombre`)
- Run both dev servers: `npm run dev` from repo root
