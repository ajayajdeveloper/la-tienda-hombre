// End-to-end smoke test: drives a real Chrome through the whole storefront
// (home -> listing -> filters -> product -> cart -> coupon -> checkout ->
// confirmation -> refresh -> search -> menu/filters -> 404) at desktop and
// phone sizes. Records console errors, failed requests and HTTP errors, and
// saves a screenshot of every step to ./smoke-shots/.
//
//   npm run dev                  # or: npm run prod:up
//   npm run smoke                # BASE=http://localhost:8080 npm run smoke for prod
//
// NOTE: it places real orders (2 per run) in whatever database BASE points at.
import puppeteer from 'puppeteer-core'

const BASE = process.env.BASE ?? 'http://localhost:5174'
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const OUT = new URL('../smoke-shots/', import.meta.url).pathname
const problems = []

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
})

function watch(page, label) {
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') problems.push(`[${label}] console.${msg.type()}: ${msg.text()}`)
  })
  page.on('pageerror', (err) => problems.push(`[${label}] pageerror: ${err.message}`))
  page.on('requestfailed', (req) => problems.push(`[${label}] requestfailed: ${req.url()} ${req.failure()?.errorText}`))
  page.on('response', (res) => {
    if (res.status() >= 400 && !res.url().includes('/delivery/')) problems.push(`[${label}] HTTP ${res.status()}: ${res.url()}`)
  })
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
async function shot(page, name) {
  await wait(400)
  await page.screenshot({ path: `${OUT}${name}.png`, fullPage: false })
}
async function clickText(page, selector, text) {
  const handles = await page.$$(selector)
  for (const h of handles) {
    const t = await h.evaluate((el) => el.textContent.trim())
    if (t.includes(text)) {
      await h.click()
      return true
    }
  }
  throw new Error(`no ${selector} with text "${text}"`)
}

async function run(label, viewport) {
  const page = await browser.newPage()
  await page.setViewport(viewport)
  watch(page, label)

  await page.goto(BASE, { waitUntil: 'networkidle0' })
  await shot(page, `${label}-01-home`)
  await page.evaluate(() => window.scrollTo(0, 900))
  await shot(page, `${label}-02-home-scrolled`)

  await page.goto(`${BASE}/c/shirts`, { waitUntil: 'networkidle0' })
  await shot(page, `${label}-03-listing`)

  // Filter by size M via URL-driven filters
  await page.goto(`${BASE}/c/shirts?sizes=M&colors=Navy`, { waitUntil: 'networkidle0' })
  await shot(page, `${label}-04-listing-filtered`)

  await page.goto(`${BASE}/products/pure-linen-shirt`, { waitUntil: 'networkidle0' })
  await shot(page, `${label}-05-pdp`)

  // Try add without size -> message
  await clickText(page, 'button', label === 'mobile' ? 'Select size' : 'Add to bag')
  await wait(200)
  // Pick first in-stock size
  const sizeButtons = await page.$$('[role="radiogroup"][aria-label="Choose a size"] button[data-soldout="false"]')
  await sizeButtons[0].click()
  await clickText(page, 'button', 'Add to bag')
  await wait(600)
  await shot(page, `${label}-06-cart-drawer`)

  // Second product, choose a sold-out size to see notify-me
  await page.goto(`${BASE}/products/everyday-crew-tee`, { waitUntil: 'networkidle0' })
  const soldOut = await page.$('[aria-label="Choose a size"] button[data-soldout="true"]')
  if (soldOut) {
    await soldOut.click()
    await shot(page, `${label}-07-pdp-soldout`)
  }
  const inStock = await page.$$('[aria-label="Choose a size"] button[data-soldout="false"]')
  await inStock[0].click()
  await clickText(page, 'button', 'Add to bag')
  await wait(400)

  await page.goto(`${BASE}/cart`, { waitUntil: 'networkidle0' })
  await page.type('input[aria-label="Coupon code"]', 'welcome10')
  await clickText(page, 'button', 'Apply')
  await wait(800)
  await shot(page, `${label}-08-cart`)

  await page.goto(`${BASE}/checkout`, { waitUntil: 'networkidle0' })
  const fill = async (sel, value) => page.type(sel, value)
  await fill('input[autocomplete="name"]', 'Asha Verma')
  await fill('input[type="email"]', 'asha@example.com')
  await fill('input[type="tel"]', '9876543210')
  await fill('textarea[autocomplete="street-address"]', '42 Residency Road, Ashok Nagar')
  await fill('input[autocomplete="postal-code"]', '560025')
  await fill('input[autocomplete="address-level2"]', 'Bengaluru')
  await page.select('select[autocomplete="address-level1"]', 'Karnataka')
  await wait(800)
  await shot(page, `${label}-09-checkout`)
  await clickText(page, 'button', 'Place order')
  await page.waitForFunction(() => location.pathname.startsWith('/orders/'), { timeout: 8000 })
  await page.waitForNetworkIdle()
  await shot(page, `${label}-10-confirmation`)

  // Refresh survives (v1 lost it)
  await page.reload({ waitUntil: 'networkidle0' })
  const title = await page.$eval('h1', (el) => el.textContent)
  if (!title.includes('order')) problems.push(`[${label}] confirmation lost after refresh: ${title}`)

  // Search overlay
  await page.goto(BASE, { waitUntil: 'networkidle0' })
  await page.click('button[aria-label="Search"]')
  await page.type('input[type="search"]', 'linen')
  await wait(900)
  await shot(page, `${label}-11-search`)

  if (label === 'mobile') {
    await page.keyboard.press('Escape')
    await page.click('button[aria-label="Open menu"]')
    await wait(500)
    await shot(page, `${label}-12-menu`)
    await page.keyboard.press('Escape')
    await page.goto(`${BASE}/c/bottoms`, { waitUntil: 'networkidle0' })
    await clickText(page, 'button', 'Filters')
    await wait(500)
    await shot(page, `${label}-13-filters`)
  } else {
    await page.keyboard.press('Escape')
    await page.goto(`${BASE}/c/winterwear`, { waitUntil: 'networkidle0' })
    await page.hover('a[href="/c/shirts"]')
    await wait(500)
    await shot(page, `${label}-12-megamenu`)
  }

  await page.goto(`${BASE}/does-not-exist`, { waitUntil: 'networkidle0' })
  await shot(page, `${label}-14-404`)
  await page.close()
}

import { mkdirSync } from 'node:fs'
mkdirSync(OUT, { recursive: true })
try {
  await run('desktop', { width: 1440, height: 900 })
  await run('mobile', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
} catch (err) {
  problems.push(`FLOW FAILED: ${err.stack}`)
} finally {
  await browser.close()
}
console.log(problems.length ? problems.join('\n') : `no problems recorded (screenshots in ${OUT})`)
process.exitCode = problems.length ? 1 : 0
