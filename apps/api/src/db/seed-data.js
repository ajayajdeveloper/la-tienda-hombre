// Catalogue content for the seed script and the image generator.
// Money is in paise (1/100 rupee), like every *_cents column: 129900 = ₹1,299.

export const COLORS = {
  white: { name: 'White', hex: '#F4F2EC' },
  black: { name: 'Black', hex: '#1F1F1F' },
  navy: { name: 'Navy', hex: '#1F2D4A' },
  sky: { name: 'Sky Blue', hex: '#9EC1DE' },
  olive: { name: 'Olive', hex: '#5E6B3E' },
  sand: { name: 'Sand', hex: '#D8C3A0' },
  khaki: { name: 'Khaki', hex: '#B49A6C' },
  rust: { name: 'Rust', hex: '#A4502F' },
  maroon: { name: 'Maroon', hex: '#6A2232' },
  charcoal: { name: 'Charcoal', hex: '#3C3E42' },
  grey: { name: 'Grey Melange', hex: '#A3A5A8' },
  sage: { name: 'Sage', hex: '#9CAF94' },
  cream: { name: 'Cream', hex: '#EDE3CC' },
  bottle: { name: 'Bottle Green', hex: '#24473A' },
  midwash: { name: 'Mid Wash', hex: '#56739A' },
  darkwash: { name: 'Dark Wash', hex: '#27344F' },
  lightwash: { name: 'Light Wash', hex: '#93ADC9' },
  mustard: { name: 'Mustard', hex: '#C99A2E' },
}

const TOP_SIZES = ['S', 'M', 'L', 'XL', 'XXL']
const WAIST_SIZES = ['28', '30', '32', '34', '36']

// Top-level categories and their subcategories (the mega menu).
export const CATEGORIES = [
  {
    name: 'Shirts', slug: 'shirts',
    children: [
      { name: 'Plain Shirts', slug: 'plain-shirts' },
      { name: 'Linen Shirts', slug: 'linen-shirts' },
      { name: 'Check Shirts', slug: 'check-shirts' },
      { name: 'Printed Shirts', slug: 'printed-shirts' },
      { name: 'Overshirts', slug: 'overshirts' },
    ],
  },
  {
    name: 'T-Shirts', slug: 't-shirts',
    children: [
      { name: 'Crew Neck', slug: 'crew-neck-tees' },
      { name: 'Oversized', slug: 'oversized-tees' },
      { name: 'Polos', slug: 'polos' },
    ],
  },
  {
    name: 'Bottoms', slug: 'bottoms',
    children: [
      { name: 'Chinos', slug: 'chinos' },
      { name: 'Jeans', slug: 'jeans' },
      { name: 'Trousers', slug: 'trousers' },
      { name: 'Joggers', slug: 'joggers' },
      { name: 'Shorts', slug: 'shorts' },
    ],
  },
  {
    name: 'Winterwear', slug: 'winterwear',
    children: [
      { name: 'Hoodies', slug: 'hoodies' },
      { name: 'Sweatshirts', slug: 'sweatshirts' },
      { name: 'Sweaters', slug: 'sweaters' },
      { name: 'Jackets', slug: 'jackets' },
    ],
  },
]

export const COLLECTIONS = [
  { name: 'Office Ready', slug: 'office-ready', tagline: 'Crisp shirts and sharp trousers for Monday to Friday.' },
  { name: 'Linen Days', slug: 'linen-days', tagline: 'Breathable linen for long, hot afternoons.' },
  { name: 'Weekend Casual', slug: 'weekend-casual', tagline: 'Easy fits for doing nothing in particular.' },
  { name: 'Winter Layers', slug: 'winter-layers', tagline: 'Warm layers that look good stacked.' },
  { name: 'The Essentials', slug: 'the-essentials', tagline: 'The pieces you will reach for every week.' },
]

// kind    = garment silhouette used by the image generator
// pattern = solid | check | stripe | print
// ageDays = how long ago it was added (drives "Newest" sort and NEW badges)
export const PRODUCTS = [
  // ------------------------------------------------------------- shirts
  {
    name: 'Classic Oxford Shirt', sub: 'plain-shirts', kind: 'shirt', pattern: 'solid',
    price: 149900, mrp: 199900, badge: 'bestseller', fit: 'Regular Fit', fabric: '100% Cotton Oxford',
    colors: ['white', 'sky', 'navy'], sold: 940, ageDays: 120, collections: ['office-ready', 'the-essentials'],
    description: 'A button-down oxford in a soft, slightly textured cotton. Wear it tucked with chinos or open over a tee.',
    highlights: { Fit: 'Regular', Fabric: 'Cotton Oxford, 140 GSM', Collar: 'Button-down', Sleeve: 'Full sleeve', Occasion: 'Office, Casual' },
  },
  {
    name: 'Stretch Poplin Shirt', sub: 'plain-shirts', kind: 'shirt', pattern: 'solid',
    price: 129900, mrp: 179900, fit: 'Slim Fit', fabric: 'Cotton Poplin with Stretch',
    colors: ['white', 'black', 'sage'], sold: 410, ageDays: 75, collections: ['office-ready'],
    description: 'Smooth poplin with 2% stretch so it moves with you through a long day at the desk.',
    highlights: { Fit: 'Slim', Fabric: '98% Cotton, 2% Elastane', Collar: 'Spread', Sleeve: 'Full sleeve', Occasion: 'Office' },
  },
  {
    name: 'Pure Linen Shirt', sub: 'linen-shirts', kind: 'shirt', pattern: 'solid',
    price: 199900, mrp: 249900, badge: 'bestseller', fit: 'Relaxed Fit', fabric: '100% Linen',
    colors: ['sand', 'white', 'olive', 'sky'], sold: 820, ageDays: 40, collections: ['linen-days', 'weekend-casual'],
    description: 'Garment-washed pure linen that gets softer every wash. Cut a little loose for airflow.',
    highlights: { Fit: 'Relaxed', Fabric: '100% Linen, 160 GSM', Collar: 'Spread', Sleeve: 'Full sleeve', Occasion: 'Vacation, Casual' },
  },
  {
    name: 'Linen Blend Half Sleeve Shirt', sub: 'linen-shirts', kind: 'shirt-half', pattern: 'solid',
    price: 129900, mrp: 159900, fit: 'Regular Fit', fabric: 'Linen Cotton Blend',
    colors: ['cream', 'rust', 'sage'], sold: 360, ageDays: 12, badge: 'new', collections: ['linen-days'],
    description: 'A half-sleeve linen-cotton blend with a camp collar. Made for 35-degree afternoons.',
    highlights: { Fit: 'Regular', Fabric: '55% Linen, 45% Cotton', Collar: 'Camp', Sleeve: 'Half sleeve', Occasion: 'Casual' },
  },
  {
    name: 'Brushed Flannel Check Shirt', sub: 'check-shirts', kind: 'shirt', pattern: 'check',
    price: 169900, mrp: 219900, fit: 'Regular Fit', fabric: 'Brushed Cotton Flannel',
    colors: ['maroon', 'bottle', 'navy'], sold: 530, ageDays: 20, badge: 'new', collections: ['winter-layers', 'weekend-casual'],
    description: 'A soft, brushed flannel in a classic check. Warm enough to wear open as a light layer.',
    highlights: { Fit: 'Regular', Fabric: '100% Cotton Flannel, 180 GSM', Collar: 'Button-down', Sleeve: 'Full sleeve', Pattern: 'Check' },
  },
  {
    name: 'Gingham Check Shirt', sub: 'check-shirts', kind: 'shirt', pattern: 'check',
    price: 119900, mrp: 159900, fit: 'Slim Fit', fabric: 'Cotton Gingham',
    colors: ['sky', 'black'], sold: 280, ageDays: 95, collections: ['office-ready'],
    description: 'A small-scale gingham that reads as texture from a distance. Smart enough for the office.',
    highlights: { Fit: 'Slim', Fabric: '100% Cotton', Collar: 'Spread', Sleeve: 'Full sleeve', Pattern: 'Gingham' },
  },
  {
    name: 'Pinstripe Shirt', sub: 'check-shirts', kind: 'shirt', pattern: 'stripe',
    price: 139900, fit: 'Slim Fit', fabric: 'Cotton Twill',
    colors: ['white', 'sky'], sold: 190, ageDays: 150, collections: ['office-ready'],
    description: 'Fine pinstripes on a crisp twill. Pairs with navy trousers and brown shoes.',
    highlights: { Fit: 'Slim', Fabric: '100% Cotton Twill', Collar: 'Cutaway', Sleeve: 'Full sleeve', Pattern: 'Stripe' },
  },
  {
    name: 'Ditsy Print Resort Shirt', sub: 'printed-shirts', kind: 'shirt-half', pattern: 'print',
    price: 109900, mrp: 149900, badge: 'limited', fit: 'Relaxed Fit', fabric: 'Viscose',
    colors: ['navy', 'cream', 'bottle'], sold: 310, ageDays: 8, collections: ['weekend-casual', 'linen-days'],
    description: 'A fluid viscose resort shirt with a small all-over print. Limited run.',
    highlights: { Fit: 'Relaxed', Fabric: '100% Viscose', Collar: 'Camp', Sleeve: 'Half sleeve', Pattern: 'All-over print' },
  },
  {
    name: 'Heavy Twill Overshirt', sub: 'overshirts', kind: 'overshirt', pattern: 'solid',
    price: 229900, mrp: 279900, fit: 'Relaxed Fit', fabric: 'Cotton Twill, 260 GSM',
    colors: ['olive', 'khaki', 'black'], sold: 260, ageDays: 30, collections: ['winter-layers', 'weekend-casual'],
    description: 'A sturdy twill overshirt with two flap pockets. Layer it over a tee instead of a jacket.',
    highlights: { Fit: 'Relaxed', Fabric: '100% Cotton Twill, 260 GSM', Collar: 'Point', Sleeve: 'Full sleeve', Pockets: '2 flap pockets' },
  },
  {
    name: 'Corduroy Shacket', sub: 'overshirts', kind: 'overshirt', pattern: 'solid',
    price: 249900, mrp: 329900, badge: 'new', fit: 'Relaxed Fit', fabric: 'Cotton Corduroy',
    colors: ['rust', 'sand', 'charcoal'], sold: 140, ageDays: 5, collections: ['winter-layers'],
    description: 'Fine-wale corduroy in a shirt-jacket cut. Warm, soft, and easy to throw on.',
    highlights: { Fit: 'Relaxed', Fabric: '100% Cotton Corduroy, 14 wale', Collar: 'Point', Sleeve: 'Full sleeve', Pockets: '2 patch pockets' },
  },

  // ------------------------------------------------------------ t-shirts
  {
    name: 'Everyday Crew Tee', sub: 'crew-neck-tees', kind: 'tee', pattern: 'solid',
    price: 59900, mrp: 79900, badge: 'bestseller', fit: 'Regular Fit', fabric: 'Combed Cotton Jersey',
    colors: ['white', 'black', 'navy', 'grey', 'olive'], sold: 1600, ageDays: 200, collections: ['the-essentials', 'weekend-casual'],
    description: 'The tee you will buy in five colours. Combed cotton, a neat collar rib that keeps its shape.',
    highlights: { Fit: 'Regular', Fabric: '100% Combed Cotton, 180 GSM', Neck: 'Crew', Sleeve: 'Half sleeve' },
  },
  {
    name: 'Slub Cotton Tee', sub: 'crew-neck-tees', kind: 'tee', pattern: 'solid',
    price: 69900, fit: 'Slim Fit', fabric: 'Slub Cotton',
    colors: ['sand', 'sage', 'charcoal'], sold: 420, ageDays: 60, collections: ['weekend-casual'],
    description: 'Slub yarn gives this tee a subtle, uneven texture that looks better than a plain jersey.',
    highlights: { Fit: 'Slim', Fabric: '100% Slub Cotton, 160 GSM', Neck: 'Crew', Sleeve: 'Half sleeve' },
  },
  {
    name: 'Striped Breton Tee', sub: 'crew-neck-tees', kind: 'tee', pattern: 'stripe',
    price: 79900, mrp: 99900, fit: 'Regular Fit', fabric: 'Cotton Jersey',
    colors: ['navy', 'white'], sold: 230, ageDays: 18, badge: 'new', collections: ['weekend-casual'],
    description: 'Bold horizontal stripes on a mid-weight jersey. A French classic.',
    highlights: { Fit: 'Regular', Fabric: '100% Cotton, 200 GSM', Neck: 'Crew', Sleeve: 'Half sleeve', Pattern: 'Stripe' },
  },
  {
    name: 'Heavyweight Oversized Tee', sub: 'oversized-tees', kind: 'tee-oversized', pattern: 'solid',
    price: 89900, mrp: 119900, badge: 'bestseller', fit: 'Oversized Fit', fabric: 'Heavyweight Cotton, 240 GSM',
    colors: ['black', 'cream', 'charcoal', 'bottle'], sold: 1250, ageDays: 45, collections: ['weekend-casual', 'the-essentials'],
    description: 'Dropped shoulders, a boxy body, and a dense 240 GSM fabric that drapes instead of clinging.',
    highlights: { Fit: 'Oversized', Fabric: '100% Cotton, 240 GSM', Neck: 'Crew', Sleeve: 'Drop shoulder' },
  },
  {
    name: 'Graphic Oversized Tee', sub: 'oversized-tees', kind: 'tee-oversized', pattern: 'print',
    price: 79900, mrp: 109900, badge: 'limited', fit: 'Oversized Fit', fabric: 'Cotton Jersey',
    colors: ['white', 'black'], sold: 670, ageDays: 3, collections: ['weekend-casual'],
    description: 'An all-over print on our boxy oversized cut. Small run, will not be restocked.',
    highlights: { Fit: 'Oversized', Fabric: '100% Cotton, 220 GSM', Neck: 'Crew', Sleeve: 'Drop shoulder', Pattern: 'Print' },
  },
  {
    name: 'Pique Polo', sub: 'polos', kind: 'polo', pattern: 'solid',
    price: 99900, mrp: 129900, fit: 'Regular Fit', fabric: 'Cotton Pique',
    colors: ['navy', 'white', 'bottle', 'maroon'], sold: 780, ageDays: 110, collections: ['office-ready', 'the-essentials'],
    description: 'A textured pique polo with a two-button placket. Smart enough for Friday at the office.',
    highlights: { Fit: 'Regular', Fabric: '100% Cotton Pique, 210 GSM', Collar: 'Polo', Sleeve: 'Half sleeve' },
  },
  {
    name: 'Knit Polo', sub: 'polos', kind: 'polo', pattern: 'stripe',
    price: 129900, fit: 'Slim Fit', fabric: 'Cotton Knit',
    colors: ['cream', 'navy'], sold: 150, ageDays: 14, badge: 'new', collections: ['weekend-casual'],
    description: 'A flat-knit polo with a fine textured stripe. Looks smarter than a regular polo.',
    highlights: { Fit: 'Slim', Fabric: '100% Cotton Knit', Collar: 'Polo', Sleeve: 'Half sleeve', Pattern: 'Textured stripe' },
  },

  // ------------------------------------------------------------- bottoms
  {
    name: 'Slim Stretch Chinos', sub: 'chinos', kind: 'trousers', pattern: 'solid',
    price: 149900, mrp: 199900, badge: 'bestseller', fit: 'Slim Fit', fabric: 'Cotton Twill with Stretch',
    colors: ['khaki', 'navy', 'olive', 'black'], sold: 1100, ageDays: 160, collections: ['office-ready', 'the-essentials'],
    description: 'Chinos with a little stretch for all-day comfort. Tapered from the knee down.',
    highlights: { Fit: 'Slim', Fabric: '98% Cotton, 2% Elastane', Rise: 'Mid rise', Closure: 'Zip fly with button' },
  },
  {
    name: 'Relaxed Pleated Chinos', sub: 'chinos', kind: 'trousers', pattern: 'solid',
    price: 169900, fit: 'Relaxed Fit', fabric: 'Cotton Twill',
    colors: ['sand', 'charcoal'], sold: 220, ageDays: 10, badge: 'new', collections: ['weekend-casual'],
    description: 'A single front pleat and a roomier leg. Wear with a tucked tee and loafers.',
    highlights: { Fit: 'Relaxed', Fabric: '100% Cotton Twill', Rise: 'High rise', Closure: 'Zip fly with hook' },
  },
  {
    name: 'Straight Fit Jeans', sub: 'jeans', kind: 'jeans', pattern: 'solid',
    price: 179900, mrp: 239900, badge: 'bestseller', fit: 'Straight Fit', fabric: 'Rigid Cotton Denim',
    colors: ['midwash', 'darkwash', 'black'], sold: 990, ageDays: 140, collections: ['the-essentials', 'weekend-casual'],
    description: 'A straight leg in 12 oz denim that breaks in to fit you. Classic five-pocket build.',
    highlights: { Fit: 'Straight', Fabric: '100% Cotton Denim, 12 oz', Rise: 'Mid rise', Closure: 'Button fly' },
  },
  {
    name: 'Slim Tapered Jeans', sub: 'jeans', kind: 'jeans', pattern: 'solid',
    price: 169900, mrp: 219900, fit: 'Slim Fit', fabric: 'Stretch Denim',
    colors: ['lightwash', 'darkwash'], sold: 640, ageDays: 85, collections: ['weekend-casual'],
    description: 'Slim through the thigh, tapered at the ankle, with stretch for easy movement.',
    highlights: { Fit: 'Slim Tapered', Fabric: '98% Cotton, 2% Elastane', Rise: 'Mid rise', Closure: 'Zip fly' },
  },
  {
    name: 'Baggy Fit Jeans', sub: 'jeans', kind: 'jeans-baggy', pattern: 'solid',
    price: 199900, mrp: 259900, badge: 'new', fit: 'Baggy Fit', fabric: 'Rigid Cotton Denim',
    colors: ['lightwash', 'midwash'], sold: 380, ageDays: 6, collections: ['weekend-casual'],
    description: 'A wide, relaxed leg that stacks at the ankle. The cut everyone is asking for.',
    highlights: { Fit: 'Baggy', Fabric: '100% Cotton Denim, 13 oz', Rise: 'High rise', Closure: 'Zip fly' },
  },
  {
    name: 'Tailored Formal Trousers', sub: 'trousers', kind: 'trousers', pattern: 'solid',
    price: 189900, mrp: 239900, fit: 'Slim Fit', fabric: 'Poly Viscose',
    colors: ['charcoal', 'navy', 'black'], sold: 450, ageDays: 130, collections: ['office-ready'],
    description: 'Wrinkle-resistant trousers with a sharp crease. Machine washable.',
    highlights: { Fit: 'Slim', Fabric: '70% Polyester, 30% Viscose', Rise: 'Mid rise', Closure: 'Hook and bar' },
  },
  {
    name: 'Linen Drawstring Trousers', sub: 'trousers', kind: 'joggers', pattern: 'solid',
    price: 159900, mrp: 199900, fit: 'Relaxed Fit', fabric: 'Linen Blend',
    colors: ['sand', 'white', 'olive'], sold: 300, ageDays: 22, collections: ['linen-days'],
    description: 'An elasticated drawstring waist and a straight linen leg. Holiday trousers.',
    highlights: { Fit: 'Relaxed', Fabric: '55% Linen, 45% Cotton', Rise: 'Mid rise', Closure: 'Drawstring' },
  },
  {
    name: 'French Terry Joggers', sub: 'joggers', kind: 'joggers', pattern: 'solid',
    price: 119900, mrp: 159900, badge: 'bestseller', fit: 'Slim Fit', fabric: 'Cotton French Terry',
    colors: ['grey', 'black', 'navy'], sold: 870, ageDays: 70, collections: ['weekend-casual', 'the-essentials'],
    description: 'Looped-back terry joggers with zip pockets and ribbed cuffs.',
    highlights: { Fit: 'Slim', Fabric: '100% Cotton French Terry, 280 GSM', Closure: 'Drawstring', Pockets: '2 zip pockets' },
  },
  {
    name: 'Cargo Joggers', sub: 'joggers', kind: 'joggers', pattern: 'solid',
    price: 149900, fit: 'Relaxed Fit', fabric: 'Cotton Twill',
    colors: ['olive', 'khaki', 'black'], sold: 340, ageDays: 28, collections: ['weekend-casual'],
    description: 'Utility cargo pockets on a relaxed jogger. Durable twill.',
    highlights: { Fit: 'Relaxed', Fabric: '100% Cotton Twill', Closure: 'Drawstring', Pockets: '6 pockets' },
  },
  {
    name: 'Chino Shorts', sub: 'shorts', kind: 'shorts', pattern: 'solid',
    price: 89900, mrp: 119900, fit: 'Regular Fit', fabric: 'Cotton Twill',
    colors: ['khaki', 'navy', 'sage'], sold: 520, ageDays: 50, collections: ['linen-days', 'weekend-casual'],
    description: 'A 7-inch inseam chino short. Crisp enough for brunch, easy enough for the beach.',
    highlights: { Fit: 'Regular', Fabric: '100% Cotton Twill', Length: '7 inch inseam', Closure: 'Zip fly' },
  },
  {
    name: 'Linen Shorts', sub: 'shorts', kind: 'shorts', pattern: 'solid',
    price: 99900, fit: 'Relaxed Fit', fabric: 'Linen Blend',
    colors: ['white', 'sand'], sold: 180, ageDays: 15, badge: 'new', collections: ['linen-days'],
    description: 'Drawstring linen shorts for the hottest days of the year.',
    highlights: { Fit: 'Relaxed', Fabric: '55% Linen, 45% Cotton', Length: '6 inch inseam', Closure: 'Drawstring' },
  },

  // ---------------------------------------------------------- winterwear
  {
    name: 'Heavyweight Hoodie', sub: 'hoodies', kind: 'hoodie', pattern: 'solid',
    price: 199900, mrp: 279900, badge: 'bestseller', fit: 'Oversized Fit', fabric: 'Cotton Fleece, 380 GSM',
    colors: ['black', 'grey', 'bottle', 'cream'], sold: 980, ageDays: 35, collections: ['winter-layers', 'the-essentials'],
    description: 'A dense brushed-back fleece hoodie with a double-layer hood and kangaroo pocket.',
    highlights: { Fit: 'Oversized', Fabric: '80% Cotton, 20% Polyester, 380 GSM', Neck: 'Hooded', Sleeve: 'Full sleeve' },
  },
  {
    name: 'Zip-Through Hoodie', sub: 'hoodies', kind: 'hoodie', pattern: 'solid',
    price: 219900, fit: 'Regular Fit', fabric: 'Cotton Fleece',
    colors: ['navy', 'charcoal'], sold: 260, ageDays: 9, badge: 'new', collections: ['winter-layers'],
    description: 'A full-zip hoodie with metal hardware. Layers easily under a jacket.',
    highlights: { Fit: 'Regular', Fabric: '80% Cotton, 20% Polyester, 320 GSM', Neck: 'Hooded', Closure: 'Full zip' },
  },
  {
    name: 'Crewneck Sweatshirt', sub: 'sweatshirts', kind: 'sweatshirt', pattern: 'solid',
    price: 149900, mrp: 199900, fit: 'Regular Fit', fabric: 'Cotton Fleece',
    colors: ['grey', 'navy', 'mustard', 'sage'], sold: 610, ageDays: 55, collections: ['winter-layers', 'weekend-casual'],
    description: 'A classic crewneck sweatshirt with ribbed cuffs and hem.',
    highlights: { Fit: 'Regular', Fabric: '80% Cotton, 20% Polyester, 320 GSM', Neck: 'Crew', Sleeve: 'Full sleeve' },
  },
  {
    name: 'Cable Knit Sweater', sub: 'sweaters', kind: 'sweater', pattern: 'solid',
    price: 249900, mrp: 319900, fit: 'Regular Fit', fabric: 'Acrylic Wool Blend',
    colors: ['cream', 'bottle', 'navy'], sold: 230, ageDays: 25, collections: ['winter-layers'],
    description: 'A chunky cable knit that looks hand-made. Warm without being itchy.',
    highlights: { Fit: 'Regular', Fabric: '70% Acrylic, 30% Wool', Neck: 'Crew', Sleeve: 'Full sleeve' },
  },
  {
    name: 'Merino Blend Turtleneck', sub: 'sweaters', kind: 'sweater', pattern: 'solid',
    price: 279900, fit: 'Slim Fit', fabric: 'Merino Wool Blend',
    colors: ['black', 'charcoal', 'maroon'], sold: 120, ageDays: 4, badge: 'new', collections: ['winter-layers', 'office-ready'],
    description: 'A fine-gauge merino blend turtleneck. Wear it under a blazer or on its own.',
    highlights: { Fit: 'Slim', Fabric: '50% Merino Wool, 50% Acrylic', Neck: 'Turtleneck', Sleeve: 'Full sleeve' },
  },
  {
    name: 'Quilted Bomber Jacket', sub: 'jackets', kind: 'jacket', pattern: 'solid',
    price: 299900, mrp: 399900, badge: 'bestseller', fit: 'Regular Fit', fabric: 'Nylon Shell, Poly Fill',
    colors: ['olive', 'black', 'navy'], sold: 540, ageDays: 65, collections: ['winter-layers'],
    description: 'A lightly padded bomber with ribbed collar, cuffs and hem. Water-resistant shell.',
    highlights: { Fit: 'Regular', Fabric: '100% Nylon shell, polyester fill', Closure: 'Zip', Pockets: '2 side pockets' },
  },
  {
    name: 'Denim Trucker Jacket', sub: 'jackets', kind: 'jacket', pattern: 'solid',
    price: 259900, mrp: 329900, fit: 'Regular Fit', fabric: 'Cotton Denim',
    colors: ['midwash', 'darkwash'], sold: 330, ageDays: 100, collections: ['weekend-casual', 'winter-layers'],
    description: 'A classic trucker jacket in rigid denim that fades with wear.',
    highlights: { Fit: 'Regular', Fabric: '100% Cotton Denim, 13 oz', Closure: 'Button', Pockets: '4 pockets' },
  },
  {
    name: 'Puffer Jacket', sub: 'jackets', kind: 'jacket', pattern: 'solid',
    price: 349900, mrp: 449900, badge: 'limited', fit: 'Regular Fit', fabric: 'Nylon, Poly Fill',
    colors: ['black', 'bottle', 'sand'], sold: 210, ageDays: 2, collections: ['winter-layers'],
    description: 'A warm, lightweight puffer that packs into its own pocket.',
    highlights: { Fit: 'Regular', Fabric: '100% Nylon, polyester fill', Closure: 'Zip', Hood: 'Detachable' },
  },
]

export function sizesFor(kind) {
  return ['trousers', 'jeans', 'jeans-baggy', 'joggers', 'shorts'].includes(kind) ? WAIST_SIZES : TOP_SIZES
}

export function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

// One image file per (silhouette, pattern, colour, view). Products that share a
// silhouette+pattern+colour share artwork, like a real store reusing a flat-lay.
export function imageUrl(kind, pattern, colorKey, view) {
  return `/images/products/${kind}-${pattern}-${colorKey}-${view}.svg`
}

export const COUPONS = [
  { code: 'WELCOME10', description: '10% off orders above ₹999, up to ₹300', discount_type: 'percent', discount_value: 10, max_discount_cents: 30000, min_subtotal_cents: 99900 },
  { code: 'FLAT200', description: '₹200 off on orders above ₹1,999', discount_type: 'flat', discount_value: 20000, min_subtotal_cents: 199900 },
  { code: 'BIG500', description: '₹500 off on orders above ₹3,999', discount_type: 'flat', discount_value: 50000, min_subtotal_cents: 399900 },
  { code: 'SUMMER25', description: '25% off, ended last season', discount_type: 'percent', discount_value: 25, min_subtotal_cents: 0, expires_at: '2025-06-30T23:59:59Z' },
]

// Warehouse in Bengaluru, so South India is fastest. 1-digit prefixes cover
// every valid pincode; 2-3 digit prefixes override for metros and remote areas.
export const DELIVERY_ZONES = [
  { prefix: '1', region: 'North India', delivery_days: 5, cod_available: true },
  { prefix: '2', region: 'Uttar Pradesh & Uttarakhand', delivery_days: 5, cod_available: true },
  { prefix: '3', region: 'Rajasthan & Gujarat', delivery_days: 5, cod_available: true },
  { prefix: '4', region: 'West & Central India', delivery_days: 4, cod_available: true },
  { prefix: '5', region: 'South India', delivery_days: 3, cod_available: true },
  { prefix: '6', region: 'Tamil Nadu & Kerala', delivery_days: 4, cod_available: true },
  { prefix: '7', region: 'East & North-East India', delivery_days: 6, cod_available: true },
  { prefix: '8', region: 'Bihar & Jharkhand', delivery_days: 6, cod_available: true },
  { prefix: '9', region: 'Army Postal Service', delivery_days: 10, cod_available: false },
  { prefix: '19', region: 'Jammu & Kashmir', delivery_days: 8, cod_available: false },
  { prefix: '79', region: 'North-East India', delivery_days: 8, cod_available: false },
  { prefix: '110', region: 'Delhi', delivery_days: 2, cod_available: true },
  { prefix: '400', region: 'Mumbai', delivery_days: 2, cod_available: true },
  { prefix: '411', region: 'Pune', delivery_days: 2, cod_available: true },
  { prefix: '500', region: 'Hyderabad', delivery_days: 2, cod_available: true },
  { prefix: '560', region: 'Bengaluru', delivery_days: 1, cod_available: true },
  { prefix: '600', region: 'Chennai', delivery_days: 2, cod_available: true },
  { prefix: '700', region: 'Kolkata', delivery_days: 3, cod_available: true },
]

export const REVIEW_AUTHORS = [
  'Rahul K.', 'Arjun M.', 'Vikram S.', 'Karthik R.', 'Aditya P.', 'Rohan D.', 'Siddharth N.', 'Nikhil T.',
  'Imran A.', 'Joel F.', 'Harpreet S.', 'Ankit G.', 'Pranav B.', 'Varun I.', 'Dev C.', 'Manish L.',
]

export const REVIEW_TEMPLATES = {
  5: [
    ['Exactly what I wanted', 'Fit is spot on and the fabric feels premium. Ordering another colour.'],
    ['Great quality', 'Washed it three times already, no shrinking and the colour is holding up.'],
    ['Best purchase this month', 'Looks even better in person. Fast delivery too.'],
  ],
  4: [
    ['Good, runs slightly large', 'Really nice fabric. I would size down if you are between sizes.'],
    ['Solid everyday piece', 'Comfortable and looks sharp. Wish there were more colours.'],
  ],
  3: [['Decent', 'Quality is fine for the price, but the fit was a bit boxy on me.']],
  2: [['Not for me', 'Colour looked different from the photos. Returned it without any hassle though.']],
}
