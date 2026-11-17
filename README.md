# La Tienda Hombre

A menswear storefront built for learning full-stack fundamentals: React + Redux Toolkit (RTK Query) on the
front, Express + hand-written PostgreSQL on the back, deployable with Docker. It's not a real store: no orders
ship, no payments are taken.

- **v1** (branch `main`): typed by hand, line by line. Catalogue, product page, Redux cart, transactional checkout.
- **v2** (branch `v2`): subcategories, faceted filters, search, reviews, coupons, delivery checks, wishlist,
  a redesigned UI, tests, a load test, and a production Docker setup.

## Quick start (development)

Requires Node 20+ and Docker.

```bash
npm install
cp apps/api/.env.example apps/api/.env
npm run db:up            # Postgres in Docker on :5433
npm run db:migrate
npm run db:seed          # 36 products; refuses if orders exist
                         # (to wipe and reseed: npm run db:seed -w apps/api -- --force)
npm run dev              # API :4000 + web :5174 → open http://localhost:5174
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev:neon` | Same as `npm run dev`, but the API uses the Neon cloud database from `apps/api/.env.neon` (gitignored) |
| `npm run db:migrate:neon` | Apply migrations to Neon (uses the direct, non-pooled URL) |
| `npm test` | API integration tests (real Postgres, `hombre_test` database) + web unit tests |
| `npm run smoke` | Drives real Chrome through every flow at desktop and phone sizes; screenshots go to `smoke-shots/` |
| `npm run prod:up` | Builds and runs the production stack (nginx + API + Postgres) on http://localhost:8080 |
| `npm run loadtest` | 50 concurrent connections against the production stack; prints a table of req/s and latency |
| `npm run images -w apps/api` | Regenerates the SVG product illustrations |

First run of the production stack needs a seed:
`docker compose -f docker-compose.prod.yml run --rm api node src/db/seed.js`

## Docs

| | |
|---|---|
| [docs/ROADMAP-v2.md](docs/ROADMAP-v2.md) | What was built, in what order |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Request flow, where state lives, folders, data model, API |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Every decision, why it was made, and what was rejected |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Load-test numbers, VPS setup, HTTPS, backups, checklist |
| [docs/AI-WORKFLOW.md](docs/AI-WORKFLOW.md) | How to build features with an AI assistant, including what went wrong here |
| [STUDY.md](STUDY.md) | v1 revision notes |
| [JOURNAL.md](JOURNAL.md) | Session-by-session history |
