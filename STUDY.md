# Stack Recall — la-tienda-hombre Study Notes

Quick-revision reference covering everything built so far: Express, Postgres schema design, connection pooling & migrations, REST routing, React's render model, `useEffect`, react-router, and Redux Toolkit. Each section has key facts first, then interview follow-up questions with answers.

---

## 1. Express & Middleware

**Key facts**
- `dotenv/config` must be the very first import — everything after it may read `process.env`.
- `express.json()` populates `req.body` from a JSON payload; skip it and `req.body` is `undefined`.
- `cors()` adds `Access-Control-Allow-Origin` — without it, a browser on a different origin/port silently blocks the response.
- Middleware order matters: it runs top to bottom, exactly as registered with `app.use`.
- Express 4 does **not** auto-catch a rejected Promise inside an `async` handler — a DB error can hang the request with no response. Express 5 fixes this.

**Request flow:** `Client → CORS middleware → JSON parse middleware → Route handler (pool.query) → Postgres → response flows back through the same handler`

**Interview questions**

Q: What actually breaks if you forget `express.json()`?
A: A client sends a JSON body, but `req.body` stays `undefined` inside your handler — Express never parsed the raw request stream into an object. No error is thrown; your code just silently reads nothing.

Q: Walk through what CORS is actually checking, and who enforces it.
A: The *browser* enforces it, not the server — a plain `curl` request is never blocked by CORS. The browser sends the request, but before handing the response to your JS it checks whether the response's `Access-Control-Allow-Origin` header matches the page's own origin. If it doesn't match, the browser discards the response from your script's view — the request still happened server-side.

Q: Why is middleware order significant — give a concrete example where swapping two lines breaks something.
A: If a route handler ran *before* `express.json()`, `req.body` would be undefined even on a valid JSON request, because the parsing middleware never got a chance to run first. Each middleware either calls `next()` to pass control on, or ends the response — anything registered after a middleware that doesn't call `next()` never runs.

Q: What's the actual risk of an unhandled rejection inside an Express 4 `async` route handler?
A: If `pool.query(...)` rejects and you haven't wrapped it in `try/catch`, Express 4 won't route that rejection to any error-handling middleware — the request just hangs with no response ever sent, and you get an unhandled rejection warning in your server logs instead of a clean 500.

---

## 2. Postgres Schema Design

**Key facts**
- `product_variants` is its own table because stock/SKU only make sense per size+color, not per product — and it's the row you'll later lock with `SELECT ... FOR UPDATE`.
- `UNIQUE (product_id, size, color)` is a **composite** constraint — the combination must be unique, not each column alone.
- Postgres auto-indexes primary keys, but **not** foreign key columns — you index those yourself, or every join/filter on them is a full table scan.
- `order_items.unit_price_cents` is a deliberate snapshot — it copies the price at purchase time so a later price change never rewrites history.
- Always `TIMESTAMPTZ`, never plain `TIMESTAMP`, in Postgres. Always integer cents for money, never floats.

**Relationships:**
```
categories ──category_id──> products ──product_id──> product_variants
                                                            ^
orders ──order_id──> order_items ──product_variant_id──────┘
```

**Interview questions**

Q: Why not just put a `stock` column directly on `products`?
A: Stock is only meaningful per exact size/color combination — a Medium Blue shirt and a Large White shirt of the same product are physically different inventory. A single `stock` column on `products` couldn't represent that two sizes might have different quantities left.

Q: Why does Postgres not index foreign keys automatically, and what's the practical consequence?
A: Only primary keys (and columns with an explicit `UNIQUE`) get an automatic index. A foreign key column with no explicit index means any `JOIN` or `WHERE category_id = ...` on it triggers a full table scan instead of an index lookup — fine at 6 rows, a real production problem at scale.

Q: What's the difference between normalizing and deliberately snapshotting data, and when do you choose the latter?
A: Normalizing means storing a fact in exactly one place and referencing it (e.g. looking up `products.base_price_cents` live). Snapshotting means intentionally copying a value at a point in time — `order_items.unit_price_cents` — because the historical fact ("what did the customer actually pay") must never change even if the source of truth (the current product price) does later.

Q: What does the default foreign key behavior do if you try to delete a category that still has products?
A: Postgres's default is effectively `ON DELETE RESTRICT` — it refuses the delete outright rather than silently cascading or nulling the reference. You'd need to explicitly opt into `ON DELETE CASCADE` or `SET NULL` if you wanted different behavior.

---

## 3. Pooling, Migrations & Seeding

**Key facts**
- `pg.Pool` keeps a small set of open connections and hands them out, instead of paying a TCP+auth handshake per query.
- Parameterized queries (`$1, $2`) send SQL and values as separate messages to Postgres — that's *why* they prevent SQL injection, not just convention.
- ESM has no `__dirname` — the pattern is `dirname(fileURLToPath(import.meta.url))`.
- `TRUNCATE ... RESTART IDENTITY CASCADE` makes a seed script safely rerunnable: it wipes data, resets auto-increment counters, and follows FK relationships automatically.
- `RETURNING id` is how you get an auto-generated id back immediately after an `INSERT`, needed to wire up a foreign key you don't know in advance.

**Interview questions**

Q: Why use a connection pool instead of one connection per request?
A: Opening a TCP connection to Postgres and authenticating has real, measurable overhead. A pool keeps a handful of connections alive and reuses them across requests — orders of magnitude cheaper than a fresh connection every time, and it caps how many concurrent connections your app can open against the database.

Q: Concretely, how do parameterized queries stop SQL injection — not just "they're safer," but the actual mechanism?
A: With string concatenation, user input becomes part of the SQL text itself, so a value like `' OR '1'='1` can change the query's structure. With a parameterized query, the driver sends the SQL template and the values as two separate pieces over the wire — Postgres never re-parses the values as SQL syntax, so there's no way for a value to escape into being a command.

Q: What specifically makes a seed script "idempotent," and why does that matter during development?
A: Idempotent means running it multiple times produces the same end state as running it once. `TRUNCATE ... RESTART IDENTITY CASCADE` at the top guarantees that — without it, rerunning an `INSERT`-only script would either duplicate rows or fail on unique constraint violations.

Q: Why does `migrate.js` need `await pool.end()` at the end?
A: An open `pg.Pool` keeps the Node event loop alive, waiting for potential future queries. Without explicitly closing it, a one-off script would print its final log line and then just hang instead of exiting.

---

## 4. REST Routing Patterns

**Key facts**
- A `JOIN` pulling related data in one query avoids the "N+1 query" problem — one query per row is the classic anti-pattern.
- `return res.status(404).json(...)` — the `return` is load-bearing; without it, execution falls through and tries to send a second response.
- `Router()` paths are relative to wherever the router is mounted with `app.use('/api/products', router)`.
- `req.params.slug` comes from a `:slug` segment in the route path; it's always a string.

**Interview questions**

Q: What is the N+1 query problem, concretely, in the products list endpoint?
A: Fetching all products with one query, then querying `categories` once per product to get its name, would be N+1 queries (1 + one per row) instead of 1. The `JOIN` pulls `category_slug` onto each product row in the same round trip.

Q: What actually happens if you remove the `return` before `res.status(404).json(...)` in the product detail handler?
A: Execution continues to the variants query and the final `res.json(...)` call below it, attempting to send a second response on the same request — Express throws "Cannot set headers after they are sent to the client."

Q: What HTTP status codes would you use for: resource not found, a validation failure, and a successful resource creation?
A: 404 for not found, 400 (or 422) for a validation failure the client caused, 201 Created for a successful `POST` that created a new resource (as opposed to 200 for a successful read/update).

---

## 5. React's Render Model

**Key facts**
- JSX compiles to plain function calls that produce objects (the "virtual DOM") — nothing touches the real DOM during render itself.
- React calls your component functions to build a full element tree, **then** commits real DOM nodes in one batch.
- On a state change, React builds a *new* tree and diffs it against the previous one ("reconciliation") — only the actually-changed nodes get patched.
- `key` on a list item is how the diff matches old items to new ones; using array index as key breaks this the moment the list reorders.
- `useEffect` callbacks run *after* the commit and paint, not during render.

**Interview questions**

Q: What is the virtual DOM, and why does it help rather than just mutating the real DOM directly on every change?
A: It's a lightweight tree of plain JS objects describing what should be on screen. Comparing two of those objects is cheap; comparing/mutating real DOM nodes (which carry layout, style, listeners) is expensive. React uses the cheap comparison to compute the minimal real-DOM change, then does only that.

Q: Concretely, what breaks if you use the array index as a list's `key`, and when?
A: If the list can reorder, get items inserted/removed from the middle, or be filtered, the index no longer identifies "the same logical item" across renders. React can end up reusing a DOM node (and any local state tied to it) for what is now conceptually a different item — visible as items appearing to keep stale state or animate incorrectly.

Q: Does a state change always cause a visible screen update?
A: No — a state change triggers a re-render (the function runs again, a new tree is built and diffed), but if the diff finds no actual differences from before, nothing is committed to the real DOM and the browser never repaints anything.

---

## 6. Data Fetching with useEffect

**Key facts**
- The cleanup function returned from `useEffect` runs before the effect re-fires *and* on unmount.
- A `cancelled` flag set in cleanup, checked before every `setState` inside the async callback, stops a stale fetch from updating a component that's gone or moved on.
- `fetch` only rejects on a network failure — a 404/500 still resolves, so you must check `res.ok` yourself.
- `React.StrictMode` double-invokes effects in development specifically to surface a missing/broken cleanup — not a bug, and not present in production.

**Interview questions**

Q: Walk through, concretely, the exact race the `cancelled` flag prevents.
A: User opens product A (fetch A starts, slow). Before it resolves, they navigate to product B — same component instance, effect re-runs with a new `slug`. Cleanup from the A-effect sets `cancelled = true` on that closure. When the A-fetch finally resolves, its callback checks its own `cancelled` flag, sees it's true, and returns early — instead of overwriting the screen with stale product-A data after B is already showing.

Q: Why is `slug` required in the dependency array of the product detail effect?
A: React reuses the same component instance when navigating between two routes that render the same element type. Without `slug` in the deps, the effect wouldn't re-run on navigation, and the page would keep showing the first product's data forever.

Q: Why does `fetch` need an explicit `res.ok` check instead of relying on `.catch`?
A: `fetch`'s promise only rejects on things like a network failure or being blocked by CORS — a response with status 404 or 500 is still a "successful" fetch as far as the Promise API is concerned. Without checking `res.ok`, a 404 would flow into your success branch as if the data were valid.

---

## 7. Client-side Routing (react-router)

**Key facts**
- `BrowserRouter` intercepts link clicks and back/forward, syncing the URL with React state instead of asking the browser for a new page.
- `<Routes>` picks exactly one matching `<Route>` based on the current URL — conceptually the same as any other conditional render, just driven by the URL.
- `:slug` in a route path is a param, read inside the matched component via `useParams()`.
- `<Link>` renders an `<a>` but intercepts the click — a plain `<a href>` would trigger a full page reload and lose all React/Redux state.

**Interview questions**

Q: What would visibly happen if you swapped every `<Link>` for a plain `<a>`?
A: Every navigation would trigger a full page reload — the browser would re-request `index.html`, re-run the whole React bootstrap from scratch, and any in-memory state (including the Redux store, before localStorage persistence) would reset.

Q: Where does the value from `useParams()` actually come from?
A: It's router state, not component state — `<Routes>` matched the current URL against a path pattern like `/products/:slug`, extracted the matching segment, and makes it available to whatever component is rendered as that route's `element`.

---

## 8. Redux Toolkit

**Key facts**
- Redux exists to share state between components that aren't parent/child, without prop-drilling.
- `createSlice` auto-generates action creators and one combined reducer from a `reducers` object — no hand-written action type strings or `switch`.
- Reducers look like they mutate `state` directly; Immer (built into RTK) turns that into a real immutable update behind the scenes via a "draft."
- `configureStore({ reducer: { cart: cartReducer } })` is what makes the state shape `{ cart: { items: [] } }`.
- `useSelector` reads + subscribes to a slice of state; `useDispatch` hands you the function to send an action.
- `createSelector` memoizes a derived value — barely matters for a scalar sum, matters a lot once a selector returns a new array/object reference on every call.
- Rule of thumb for local vs. global: if only one component's UI needs it (a selected radio, a form draft), `useState`; if unrelated components need to read or change it, Redux.

**The loop:**
```
Component dispatches action
        │
        ▼
Store runs the matching reducer
        │
        ▼
Immer produces new immutable state
        │
        ▼
useSelector notices the change (in every subscribed component)
        │
        ▼
Those components re-render → browser paints
        │
        └──> back to the next dispatch, on the next interaction
```
This is the *same* render loop as section 5 — Redux only changes where state lives and how you're allowed to change it (dispatch → reducer, instead of a local `setState`).

**Interview questions**

Q: What does `createSlice` actually generate for you, precisely?
A:
- An action type string per reducer key, derived as `name/reducerKey` (e.g. `cart/addItem`).
- An action creator function per key, e.g. `addItem(payload)` returning `{ type: 'cart/addItem', payload }`.
- One combined reducer function (`cartSlice.reducer`) that routes an incoming action to the matching function based on its `type`.

Q: How does Immer let you write `state.items.push(...)` without breaking Redux's immutability rule?
A: `state` inside an RTK reducer isn't the real state — it's a Proxy-based "draft" object. Immer records every operation you perform on the draft, then uses that record to construct a brand-new, properly immutable state object, leaving the original state object untouched.

Q: What problem does `createSelector`'s memoization actually solve — and why does it matter less for a scalar total than for a derived array?
A: Two calls returning the number `4500` are trivially equal by value, so recomputing a sum costs little either way. The real payoff is when a selector returns a new array or object — without memoization that's a *new reference* every call even if nothing changed, which can defeat a child's `React.memo` or wrongly re-trigger a `useEffect` watching that value.

Q: How would you decide whether a piece of UI state belongs in `useState` or Redux? Give the concrete example from this project.
A: Which size/color radio is currently selected on the product page is pure local UI state — no other component needs it, so `useState`. Once "Add to cart" is clicked, that choice becomes something the header badge, the cart page, and eventually checkout all need to read — so it moves into Redux at exactly that boundary, not before.

Q: Why does `store.subscribe` run on every dispatched action, regardless of which slice changed?
A: The store has one root reducer combining all slices; `subscribe` is registered at that root level; it has no built-in way to know which specific slice an action affected without you checking `getState()` yourself. With only one slice (cart) this is harmless — with several, you'd typically compare the relevant slice against its previous value before doing expensive work like a localStorage write.

---

*Covers la-tienda-hombre through the cart milestone. Next up: checkout — transactional order creation with row-level locking.*
