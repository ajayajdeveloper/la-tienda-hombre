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
- **Working method:** Claude explains a concept and walks through the file **in order,
  line by line, explaining why**. The user types the code in their own editor. Then
  Claude reads it back from disk and reviews it. Claude never writes anything under
  `apps/*/src/`. Claude only writes infra plumbing (docker-compose, package.json,
  `.env`, empty folders) and docs.
- **Skip the basics the user already knows:** useState, useEffect, useMemo, useRef,
  conditional rendering. Teach only what's new (router, Redux Toolkit, patterns).
- **Commits:** the user is the only author. Never add a Co-Authored-By line.
  Remote is `git@github-personal:ajayajdeveloper/la-tienda-hombre.git`.
- **Reference repo:** `../la-tienda` is a finished, verified implementation. Peek at it
  if stuck. Don't copy from it.

## Locked-in decisions

- Backend: Node + Express, plain JS (ESM), PostgreSQL through raw `pg`. No ORM, on
  purpose (practice for SQL interviews).
- Frontend: React (`.jsx`, no TS) + Vite, react-router, plain CSS.
- State: `useState`/`useEffect` for local state, Redux Toolkit for the cart.
- Money is always integer cents.
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

## Open threads / possible next steps

- Optional: search or pagination on the product list.
- `STUDY.md` needs a section on checkout, transactions and `SELECT ... FOR UPDATE`.
- Optional: `GET /api/orders/:id` so the confirmation page survives a refresh.
- v2 ideas: auth, payments, admin.
- Git only has "Initial commit". All the work above has not been committed in
  meaningful pieces.
