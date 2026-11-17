# Deployment

**Bottom line:** one small Linux server (2 vCPU, 2 GB RAM, about ₹500–1,000/month) running
`docker-compose.prod.yml` comfortably serves 50 concurrent shoppers. It has more than 10× headroom on the
slowest endpoint. The same stack was built, smoke-tested in Chrome and load-tested locally.

## 1. Capacity: the measured numbers

Measured with `npm run loadtest` against the production stack (`npm run prod:up`): 50 connections firing
non-stop for 15s per scenario. Each connection sends its next request the moment the previous one returns, so
this is far harsher than 50 humans who pause between clicks.

**Run A: containers limited to roughly a small server** (API 1 CPU / 512 MB, Postgres 1 CPU / 1 GB, nginx 0.5 CPU):

| Scenario | Requests per second | p50 | p99 | Errors |
|---|---|---|---|---|
| Homepage HTML (nginx) | 11,144 | 4 ms | 73 ms | 0 |
| Listing + facets (5 queries) | 272 | 193 ms | 388 ms | 0 |
| Listing, filtered | 242 | 195 ms | 503 ms | 0 |
| Product page | 1,617 | 19 ms | 173 ms | 0 |
| Search typeahead | 1,093 | 23 ms | 179 ms | 0 |
| Cart quote (POST) | 2,336 | 16 ms | 96 ms | 0 |

Memory under load: API 88 MB, Postgres 66 MB, nginx 10 MB.

**Run B: no limits** (Apple M3 Pro, 12 cores for Docker): listings ~1,600 req/s, product page ~2,800,
quote ~3,700, all with 0 errors.

**What 50 shoppers actually need:** a browsing shopper makes roughly one API request every 2–5 seconds
(listing, product, quote). 50 shoppers ≈ **10–25 requests per second**. The slowest endpoint (the listing with
facets) handles about 250 on a small server, which is 10× or more headroom. Everything else has 40–100×.

**The first bottleneck** will be the listing endpoint's 5 queries per request. If it ever matters, fix it in
this order: cache facet counts for 30–60s in memory, add a composite index on `product_variants(product_id,
size, color) WHERE stock_quantity > 0`, then run a second API container (the app is stateless; rate-limit
counters would move to Redis).

**A bug the load test found:** before nginx kept reusable connections to the API, about 100,000 requests failed
with 502 at roughly 2,600 req/s. nginx ran out of local ports because it opened a new connection for every
request. See DECISIONS.md F4.

## 2. Option A: one VPS with Docker Compose (recommended)

Any provider works: Hetzner, DigitalOcean, Lightsail, Linode. Choose Ubuntu 24.04, 2 vCPU, 2 GB RAM, in a
region close to your users (Mumbai or Bangalore).

```bash
# On the server, once
sudo apt update && sudo apt install -y docker.io docker-compose-v2 git
sudo usermod -aG docker $USER && newgrp docker
git clone <your repo> la-tienda-hombre && cd la-tienda-hombre && git switch v2

# Secrets: a .env next to the compose file (never commit it)
echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)" > .env

# Build and start (migrations run automatically on API boot)
docker compose -f docker-compose.prod.yml up -d --build

# Seed the catalogue ONCE (it refuses if any orders exist)
docker compose -f docker-compose.prod.yml run --rm api node src/db/seed.js

curl localhost:8080/healthz   # {"status":"ok","db":"ok"}
```

### HTTPS

Put a TLS-terminating proxy in front of port 8080. Caddy gets and renews Let's Encrypt certificates
automatically. *Not exercised in this build, because it needs a real domain:*

```
# /etc/caddy/Caddyfile
shop.example.com {
  reverse_proxy localhost:8080
}
```

With Caddy in front of nginx there are two proxies, so set `TRUST_PROXY: 2` for the API in
`docker-compose.prod.yml`. Otherwise rate limiting sees Caddy's IP for every client. Then close port 8080 in
the firewall (`ufw allow 22,80,443/tcp`) so only Caddy is reachable.

### Deploying an update

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

The API receives SIGTERM, finishes in-flight requests (15s grace), and the new container migrates and starts.
Expect a few seconds of downtime with a single API container. Zero-downtime deploys need two API replicas
behind nginx; the migration advisory lock already makes that safe.

### Backups (do this before real users arrive)

```bash
# Nightly dump, keep 14 days: crontab -e
0 3 * * * cd ~/la-tienda-hombre && docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U hombre hombre | gzip > ~/backups/hombre-$(date +\%F).sql.gz && \
  find ~/backups -name '*.sql.gz' -mtime +14 -delete
```

Copy the backups off the server (object storage, or another machine). A backup on the same disk isn't a
backup. **Restore test:** `gunzip -c file.sql.gz | docker compose … exec -T postgres psql -U hombre hombre`
on a scratch database. A backup you've never restored is a hope, not a backup.

### Logs and monitoring

- `docker compose -f docker-compose.prod.yml logs -f api`: one line per request (method, path, status, ms).
- Point an uptime checker (UptimeRobot or Better Stack, both free) at `https://shop.example.com/healthz`.
  It returns 503 if the database is down, not just when the process is dead.

## 3. Option C: free — Vercel (web + API) + Neon (Postgres)

₹0/month, no cold starts (Vercel Fluid compute), everything in Singapore. Hobby plan = **personal,
non-commercial use only**; a store that really sells needs Vercel Pro.

```
Browser ──► la-tienda-hombre-shop.vercel.app (Vite build on Vercel's CDN)
              └─ /api/*  rewrite (server-side proxy, still one origin) ──►
                 la-tienda-hombre.vercel.app (Express as one Vercel Function, region sin1)
                    └─ pg Pool + attachDatabasePool ──► Neon (ap-southeast-1, pooled URL)
```

What the code does for this: `apps/api/src/app.js` default-exports the app (Vercel's zero-config Express
detection), `apps/api/vercel.json` pins the function to `sin1`, `db/pool.js` calls `attachDatabasePool` when
`VERCEL` is set, and `apps/web/vercel.json` proxies `/api/*` to the API project and falls back to
`index.html` for client-side routes. Docker/nginx are not used on Vercel.

**Migrations don't run on deploy.** Before deploying a change that adds a migration, run
`npm run db:migrate:neon` from your machine (uses the direct URL in `apps/api/.env.neon`).

### API project
1. vercel.com → Add New → Project → import `ajayajdeveloper/la-tienda-hombre` from GitHub.
2. **Project name:** `la-tienda-hombre` (it serves the API; the domain is `la-tienda-hombre.vercel.app`) · **Root Directory:** `apps/api` · Framework: Express (auto-detected).
3. **Environment variables:**
   `DATABASE_URL` = the `NEON_POOLED_URL` value from `apps/api/.env.neon` ·
   `NODE_ENV` = `production` · `DB_POOL_MAX` = `5` · `TRUST_PROXY` = `1`
4. Deploy (`main` now contains v2).
5. Check `https://la-tienda-hombre.vercel.app/healthz` → `{"status":"ok","db":"ok"}`.

### Web project
1. Import the same repo again. **Project name:** `la-tienda-hombre-shop` · **Root Directory:** `apps/web` ·
   Framework: Vite (auto). No environment variables needed (the rewrite makes `/api` same-origin).
3. The rewrite destination in `apps/web/vercel.json` must be the API project's domain.
4. `BASE=https://la-tienda-hombre-shop.vercel.app npm run smoke` (places 2 test orders; reseed Neon after with
   `DATABASE_URL=<direct url> node apps/api/src/db/seed.js --force`).

## 4. Option B: other managed platforms (not tested in this build)

If you'd rather not run a server: a managed Postgres (Neon or Supabase, free tiers), the API as a Docker web
service (Render, Railway or Fly.io, using `apps/api/Dockerfile`), and the web app as a Docker service (using
`apps/web/Dockerfile`, with `API_HOST` set to the API's private host and port). What changes:

- `DATABASE_URL` comes from the provider; add `?sslmode=require`. Use the provider's *pooled* connection string
  and keep `DB_POOL_MAX` below its connection limit.
- Set `TRUST_PROXY` to the number of proxies the platform puts in front (usually 1).
- **Free tiers that sleep** (Render free) take 30–60s to wake on the first request, which is a bad experience for
  real shoppers. Use a paid instance (~$7/month) for anything public.
- If the web app and API end up on different domains, build the web image with
  `--build-arg VITE_API_URL=https://api.example.com` and set `WEB_ORIGIN=https://shop.example.com` on the API
  for CORS.

## 5. Pre-launch checklist

- [ ] `POSTGRES_PASSWORD` is a long random secret, stored only in the server's `.env`
- [ ] HTTPS works; port 8080 is closed to the internet
- [ ] `TRUST_PROXY` matches the number of proxies in front of the API
- [ ] Seeded once; `/api/products` returns 36 products
- [ ] `BASE=https://your-domain npm run smoke` passes (it places 2 test orders)
- [ ] Nightly backups run, and one has been restored successfully
- [ ] An uptime check on `/healthz`
- [ ] The footer still says this is a demo store, unless it really takes orders
