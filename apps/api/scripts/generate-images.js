// Generates flat-illustration product images as SVG files, one per
// (silhouette, pattern, colour, view) used in seed-data.js.
//
//   node apps/api/scripts/generate-images.js
//
// Output: apps/web/public/images/products/*.svg (served by the web app).
// SVG keeps each file at ~2-4 KB and scales to any screen density.
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { COLORS, PRODUCTS } from '../src/db/seed-data.js'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../web/public/images/products')

// ------------------------------------------------------------ colour helpers
function hexToRgb(hex) {
  const n = Number.parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`
}
function mix(hex, otherHex, amount) {
  const a = hexToRgb(hex)
  const b = hexToRgb(otherHex)
  return rgbToHex(a.map((v, i) => v + (b[i] - v) * amount))
}
const darken = (hex, amount) => mix(hex, '#000000', amount)
const lighten = (hex, amount) => mix(hex, '#ffffff', amount)
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

// --------------------------------------------------------------- silhouettes
// Each shape is drawn in a 400 x 500 box. `body` is the filled outline,
// `details` are strokes (seams, plackets, pockets) drawn on top.
const SHAPES = {
  shirt: {
    body: 'M150 82 L178 70 Q200 86 222 70 L250 82 L322 112 Q340 120 344 140 L372 318 L332 328 L300 180 L302 444 Q200 452 98 444 L100 180 L68 328 L28 318 L56 140 Q60 120 78 112 Z',
    details: [
      'M178 70 L200 112 L170 128 L160 86', 'M222 70 L200 112 L230 128 L240 86',
      'M200 112 L200 444', 'M120 170 h40 v44 h-40 z',
      'M36 300 L72 310', 'M364 300 L328 310',
    ],
    buttons: [150, 200, 250, 300, 350, 400],
  },
  'shirt-half': {
    body: 'M150 82 L178 70 Q200 86 222 70 L250 82 L318 108 L356 196 L314 214 L298 176 L300 444 Q200 452 100 444 L102 176 L86 214 L44 196 L82 108 Z',
    details: [
      'M178 70 L192 116 L162 116 L156 84', 'M222 70 L208 116 L238 116 L244 84',
      'M200 116 L200 444', 'M120 170 h40 v44 h-40 z', 'M50 182 L92 200', 'M350 182 L308 200',
    ],
    buttons: [160, 215, 270, 325, 380],
  },
  overshirt: {
    body: 'M146 80 L176 66 Q200 82 224 66 L254 80 L326 110 Q346 120 350 142 L376 326 L334 336 L304 184 L306 450 Q200 458 94 450 L96 184 L66 336 L24 326 L50 142 Q54 120 74 110 Z',
    details: [
      'M176 66 L200 114 L166 132 L156 84', 'M224 66 L200 114 L234 132 L244 84',
      'M200 114 L200 450', 'M112 168 h56 v58 h-56 z', 'M112 168 h56 v16 h-56 z',
      'M232 168 h56 v58 h-56 z', 'M232 168 h56 v16 h-56 z', 'M34 306 L72 316', 'M366 306 L328 316',
    ],
    buttons: [150, 210, 270, 330, 390],
  },
  tee: {
    body: 'M150 78 Q200 102 250 78 L320 104 L358 190 L310 208 L294 172 L296 444 Q200 452 104 444 L106 172 L90 208 L42 190 L80 104 Z',
    details: ['M150 78 Q200 116 250 78', 'M48 176 L96 196', 'M352 176 L304 196'],
  },
  'tee-oversized': {
    body: 'M146 74 Q200 98 254 74 L340 104 L378 214 L322 232 L312 196 L314 446 Q200 454 86 446 L88 196 L78 232 L22 214 L60 104 Z',
    details: ['M146 74 Q200 112 254 74', 'M28 200 L84 220', 'M372 200 L316 220', 'M112 108 L100 196', 'M288 108 L300 196'],
  },
  polo: {
    body: 'M150 80 L176 70 Q200 84 224 70 L250 80 L320 104 L358 190 L310 208 L294 172 L296 444 Q200 452 104 444 L106 172 L90 208 L42 190 L80 104 Z',
    details: [
      'M176 70 L190 112 L160 110 L154 84', 'M224 70 L210 112 L240 110 L246 84',
      'M190 92 L190 166 L210 166 L210 92', 'M48 176 L96 196', 'M352 176 L304 196',
    ],
    buttons: [120, 148],
  },
  trousers: {
    body: 'M118 52 L282 52 L298 452 L220 452 L200 168 L180 452 L102 452 Z',
    details: [
      'M118 76 L282 76', 'M200 76 L200 168', 'M200 100 Q186 140 192 160',
      'M126 82 Q150 110 164 82', 'M274 82 Q250 110 236 82',
      'M146 52 v24', 'M200 52 v24', 'M254 52 v24', 'M150 180 L140 448', 'M250 180 L260 448',
    ],
  },
  jeans: {
    body: 'M118 52 L282 52 L298 452 L220 452 L200 168 L180 452 L102 452 Z',
    details: [
      'M118 76 L282 76', 'M200 76 L200 168', 'M200 100 Q186 140 192 160',
      'M124 80 Q148 112 168 80', 'M276 80 Q252 112 232 80', 'M238 86 h22 v18 h-22 z',
      'M146 52 v24', 'M200 52 v24', 'M254 52 v24',
    ],
    stitch: true,
  },
  'jeans-baggy': {
    body: 'M112 52 L288 52 L318 452 L218 452 L200 172 L182 452 L82 452 Z',
    details: [
      'M112 76 L288 76', 'M200 76 L200 172', 'M200 100 Q186 140 192 162',
      'M120 80 Q146 114 168 80', 'M280 80 Q254 114 232 80', 'M238 86 h22 v18 h-22 z',
      'M140 52 v24', 'M200 52 v24', 'M260 52 v24', 'M90 420 Q150 430 196 420', 'M204 420 Q250 430 310 420',
    ],
    stitch: true,
  },
  joggers: {
    body: 'M116 52 L284 52 L288 410 L272 452 L218 452 L212 410 L200 168 L188 410 L182 452 L128 452 L112 410 Z',
    details: [
      'M116 84 L284 84', 'M192 84 Q186 108 178 118', 'M208 84 Q214 108 222 118',
      'M126 92 Q146 120 160 92', 'M274 92 Q254 120 240 92',
      'M114 410 L188 410', 'M212 410 L286 410',
    ],
  },
  shorts: {
    body: 'M114 92 L286 92 L304 320 L216 330 L200 206 L184 330 L96 320 Z',
    details: [
      'M114 116 L286 116', 'M200 116 L200 206', 'M122 120 Q146 150 164 120',
      'M278 120 Q254 150 236 120', 'M100 300 L182 308', 'M218 308 L300 300',
    ],
  },
  hoodie: {
    body: 'M140 92 Q140 40 200 36 Q260 40 260 92 L330 116 Q348 124 352 146 L376 338 L334 348 L304 194 L306 420 L300 448 Q200 456 100 448 L94 420 L96 194 L66 348 L24 338 L48 146 Q52 124 70 116 Z',
    details: [
      'M156 96 Q200 140 244 96', 'M156 96 Q164 56 200 50 Q236 56 244 96',
      'M188 118 L184 186', 'M212 118 L216 186',
      'M136 300 L264 300 L280 380 L120 380 Z', 'M96 420 L306 420', 'M30 318 L70 328', 'M370 318 L330 328',
    ],
  },
  sweatshirt: {
    body: 'M150 80 Q200 104 250 80 L330 112 Q348 120 352 142 L376 338 L334 348 L304 190 L306 420 L300 448 Q200 456 100 448 L94 420 L96 190 L66 348 L24 338 L48 142 Q52 120 70 112 Z',
    details: ['M150 80 Q200 120 250 80', 'M146 74 Q200 98 254 74', 'M96 420 L306 420', 'M30 318 L70 328', 'M370 318 L330 328'],
  },
  sweater: {
    body: 'M156 64 L244 64 L246 92 L330 112 Q348 120 352 142 L376 338 L334 348 L304 190 L306 420 L300 448 Q200 456 100 448 L94 420 L96 190 L66 348 L24 338 L48 142 Q52 120 70 112 L154 92 Z',
    details: [
      'M156 78 L244 78', 'M154 92 L246 92', 'M96 420 L306 420', 'M30 318 L70 328', 'M370 318 L330 328',
      'M160 120 Q172 160 160 200 Q148 240 160 280 Q172 320 160 360 Q148 400 160 418',
      'M240 120 Q228 160 240 200 Q252 240 240 280 Q228 320 240 360 Q252 400 240 418',
      'M200 120 Q212 160 200 200 Q188 240 200 280 Q212 320 200 360 Q188 400 200 418',
    ],
  },
  jacket: {
    body: 'M146 78 L176 62 L224 62 L254 78 L330 108 Q350 118 354 142 L378 330 L336 340 L306 186 L308 420 L302 448 Q200 456 98 448 L92 420 L94 186 L64 340 L22 330 L46 142 Q50 118 70 108 Z',
    details: [
      'M176 62 L176 92 Q200 100 224 92 L224 62', 'M200 96 L200 448', 'M94 420 L306 420',
      'M118 270 L150 330', 'M282 270 L250 330', 'M30 312 L68 322', 'M370 312 L332 322',
      'M120 180 L170 180', 'M230 180 L280 180',
    ],
  },
}

// ---------------------------------------------------------------- patterns
function patternDefs(pattern, base, id) {
  const line = luminance(base) > 0.6 ? darken(base, 0.35) : lighten(base, 0.45)
  switch (pattern) {
    case 'check':
      return `<pattern id="${id}" width="36" height="36" patternUnits="userSpaceOnUse">
        <rect width="36" height="36" fill="${base}"/>
        <rect width="18" height="36" fill="${line}" opacity="0.28"/>
        <rect width="36" height="18" fill="${line}" opacity="0.28"/>
        <path d="M0 0 H36 M0 0 V36" stroke="${line}" stroke-width="1.4" opacity="0.6"/></pattern>`
    case 'stripe':
      return `<pattern id="${id}" width="16" height="16" patternUnits="userSpaceOnUse">
        <rect width="16" height="16" fill="${base}"/>
        <rect width="16" height="5" fill="${line}" opacity="0.75"/></pattern>`
    case 'print':
      return `<pattern id="${id}" width="40" height="40" patternUnits="userSpaceOnUse">
        <rect width="40" height="40" fill="${base}"/>
        <circle cx="10" cy="10" r="4" fill="${line}" opacity="0.7"/>
        <path d="M28 26 l4 -8 l4 8 z" fill="${line}" opacity="0.6"/>
        <circle cx="30" cy="8" r="2" fill="${line}" opacity="0.5"/>
        <rect x="6" y="28" width="6" height="6" fill="${line}" opacity="0.5" transform="rotate(20 9 31)"/></pattern>`
    default:
      return ''
  }
}

function garment(kind, pattern, colorHex, uid) {
  const shape = SHAPES[kind]
  const edge = darken(colorHex, 0.28)
  const shade = darken(colorHex, 0.12)
  const detail = luminance(colorHex) > 0.5 ? darken(colorHex, 0.3) : lighten(colorHex, 0.22)
  const fill = pattern === 'solid' ? `url(#g${uid})` : `url(#p${uid})`

  const buttons = (shape.buttons ?? [])
    .map((y) => `<circle cx="200" cy="${y}" r="4.2" fill="${lighten(colorHex, 0.55)}" stroke="${edge}" stroke-width="1"/>`)
    .join('')
  const stitch = shape.stitch
    ? `<path d="${shape.details.join(' ')}" fill="none" stroke="#D9A24A" stroke-width="1.6" stroke-dasharray="4 3" opacity="0.9"/>`
    : ''

  return {
    defs: `
      <linearGradient id="g${uid}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${lighten(colorHex, 0.06)}"/><stop offset="1" stop-color="${shade}"/>
      </linearGradient>
      <linearGradient id="s${uid}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#000" stop-opacity="0.10"/><stop offset="0.35" stop-color="#000" stop-opacity="0"/>
        <stop offset="0.7" stop-color="#fff" stop-opacity="0.06"/><stop offset="1" stop-color="#000" stop-opacity="0.12"/>
      </linearGradient>
      ${patternDefs(pattern, colorHex, `p${uid}`)}`,
    body: `
      <path d="${shape.body}" fill="${fill}" stroke="${edge}" stroke-width="2" stroke-linejoin="round"/>
      <path d="${shape.body}" fill="url(#s${uid})"/>
      <path d="${shape.details.join(' ')}" fill="none" stroke="${detail}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.75"/>
      ${stitch}${buttons}`,
  }
}

function render(kind, pattern, colorHex, view) {
  const uid = `${kind}${pattern}${view}`.replace(/[^a-z]/g, '')
  const g = garment(kind, pattern, colorHex, uid)

  if (view === 'front') {
    // Studio flat-lay: warm backdrop, soft floor shadow, garment centred.
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" role="img">
  <defs>${g.defs}
    <radialGradient id="bg${uid}" cx="0.5" cy="0.35" r="0.8">
      <stop offset="0" stop-color="#F3F0EA"/><stop offset="1" stop-color="#E3DDD2"/>
    </radialGradient>
  </defs>
  <rect width="400" height="500" fill="url(#bg${uid})"/>
  <ellipse cx="200" cy="468" rx="150" ry="14" fill="#000" opacity="0.07"/>
  <g transform="translate(20 22) scale(0.9)">${g.body}</g>
</svg>`
  }

  // "Detail" view: tinted backdrop, cropped close-up of the upper garment.
  // Used as the hover image on product cards.
  const backdrop = luminance(colorHex) > 0.7 ? '#D9D4CA' : lighten(colorHex, 0.78)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" role="img">
  <defs>${g.defs}</defs>
  <rect width="400" height="500" fill="${backdrop}"/>
  <circle cx="330" cy="80" r="120" fill="#fff" opacity="0.18"/>
  <g transform="translate(-170 -40) scale(1.85)">${g.body}</g>
</svg>`
}

// ------------------------------------------------------------------- main
await mkdir(OUT_DIR, { recursive: true })

const jobs = new Map()
for (const p of PRODUCTS) {
  for (const colorKey of p.colors) {
    for (const view of ['front', 'detail']) {
      const file = `${p.kind}-${p.pattern}-${colorKey}-${view}.svg`
      jobs.set(file, () => render(p.kind, p.pattern, COLORS[colorKey].hex, view))
    }
  }
}

for (const [file, build] of jobs) {
  await writeFile(join(OUT_DIR, file), build().replace(/\n\s+/g, '\n'))
}
console.log(`wrote ${jobs.size} images to ${OUT_DIR}`)
