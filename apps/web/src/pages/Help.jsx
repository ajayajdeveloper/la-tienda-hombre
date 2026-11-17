import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useGetSettingsQuery } from '../store/apiSlice.js'
import { formatPrice } from '../lib/format.js'
import { useDocumentTitle } from '../lib/hooks.js'
import Accordion from '../components/ui/Accordion.jsx'

export default function Help() {
  useDocumentTitle('Help')
  const { hash } = useLocation()
  const { data: settings } = useGetSettingsQuery()
  const threshold = settings ? formatPrice(settings.freeShippingThresholdCents) : '₹999'
  const fee = settings ? formatPrice(settings.shippingFeeCents) : '₹79'

  // Jump to #shipping / #returns when linked from elsewhere.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
  }, [hash])

  const sectionStyle = { display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', scrollMarginTop: '100px' }

  return (
    <div className="container page" style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 'var(--space-10)' }}>
      <h1 className="page-title">Help</h1>

      <section id="shipping" style={sectionStyle}>
        <h2>Shipping and delivery</h2>
        <p>Orders ship from Bengaluru within 24 hours. Shipping is free above {threshold}; below that it's {fee}.</p>
        <p>Delivery takes 1–3 days to metro cities and up to 8 days to remote areas. Enter your pincode on any product page to see the date for your address. Cash on delivery is available on most pincodes.</p>
      </section>

      <section id="returns" style={sectionStyle}>
        <h2>Returns and exchanges</h2>
        <p>Return or exchange any unworn item with its tags within 15 days of delivery. Refunds for cash-on-delivery orders go to your bank account or UPI ID within 5–7 working days of pickup.</p>
      </section>

      <section id="sizing" style={sectionStyle}>
        <h2>Sizing</h2>
        <p>Every product page has a size guide in inches and centimetres. Measurements are of the body, not the garment. If you are between sizes, size up for a relaxed fit and down for a slim one.</p>
      </section>

      <section id="faq" style={sectionStyle}>
        <h2>Frequently asked questions</h2>
        <Accordion
          defaultOpen={-1}
          items={[
            { title: 'Can I change my order after placing it?', content: <p>This demo store doesn't support changes yet. In a real store you'd contact support within an hour of ordering.</p> },
            { title: 'How do coupon codes work?', content: <p>Apply one code per order in your bag. Each code shows its minimum order value; the discount is applied before shipping is calculated.</p> },
            { title: 'Is online payment available?', content: <p>Not yet. Orders are cash on delivery, where you can pay in cash or by UPI at the door.</p> },
            { title: 'Is this a real store?', content: <p>No. La Tienda Hombre is a learning project. No order is shipped and no payment is taken.</p> },
          ]}
        />
      </section>
    </div>
  )
}
