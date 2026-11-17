// Load test against a running stack (default: the production compose stack).
//
//   npm run prod:up && npm run loadtest
//   BASE=http://localhost:5174 CONNECTIONS=100 DURATION=20 npm run loadtest
//
// Each scenario keeps CONNECTIONS requests in flight non-stop: every
// connection fires its next request the moment the previous one returns.
// That is much harsher than CONNECTIONS real shoppers, who pause for seconds
// between clicks, so it gives a conservative ceiling.
import autocannon from 'autocannon'

const BASE = process.env.BASE ?? 'http://localhost:8080'
const CONNECTIONS = Number(process.env.CONNECTIONS ?? 50)
const DURATION = Number(process.env.DURATION ?? 15)

async function firstVariantIds() {
  const res = await fetch(`${BASE}/api/products/pure-linen-shirt`)
  const product = await res.json()
  return product.variants.filter((v) => v.stock_quantity > 0).slice(0, 2).map((v) => v.id)
}

const ids = await firstVariantIds()

const scenarios = [
  { name: 'Homepage HTML (nginx static)', path: '/' },
  { name: 'Listing: shirts by popularity + facets', path: '/api/products?category=shirts&sort=popular' },
  { name: 'Listing: filtered (size + colour + price)', path: '/api/products?sizes=M,L&colors=Navy,Black&maxPrice=199900' },
  { name: 'Product page', path: '/api/products/pure-linen-shirt' },
  { name: 'Search typeahead', path: '/api/search/suggest?q=lin' },
  {
    name: 'Cart quote (POST)',
    path: '/api/orders/quote',
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ items: ids.map((variantId) => ({ variantId, quantity: 1 })), couponCode: 'WELCOME10' }),
  },
]

const rows = []
for (const s of scenarios) {
  const result = await autocannon({
    url: BASE + s.path,
    method: s.method ?? 'GET',
    headers: s.headers,
    body: s.body,
    connections: CONNECTIONS,
    duration: DURATION,
  })
  rows.push({
    scenario: s.name,
    'req/s (avg)': Math.round(result.requests.average),
    'p50 ms': result.latency.p50,
    'p99 ms': result.latency.p99,
    'non-2xx': result.non2xx,
    errors: result.errors + result.timeouts,
  })
  process.stdout.write(`done: ${s.name}\n`)
}

console.log(`\n${CONNECTIONS} concurrent connections, ${DURATION}s per scenario, against ${BASE}`)
console.table(rows)
