import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../ui/Icon.jsx'
import styles from './Hero.module.css'

// Editorial slides: big type over a composed set of product images. The
// images are the same flat-lays the catalogue uses, so there are no separate
// banner assets to maintain.
const SLIDES = [
  {
    eyebrow: 'New season',
    title: 'Layers for the cold months',
    text: 'Heavyweight hoodies, corduroy shackets and quilted bombers.',
    cta: 'Shop winterwear',
    to: '/c/winterwear',
    tone: 'dark',
    images: ['hoodie-solid-bottle-front', 'jacket-solid-olive-front', 'overshirt-solid-rust-front'],
  },
  {
    eyebrow: 'Linen days',
    title: 'Breathe easy in pure linen',
    text: 'Garment-washed shirts and drawstring trousers made for 35° afternoons.',
    cta: 'Shop the collection',
    to: '/collections/linen-days',
    tone: 'light',
    images: ['shirt-solid-sand-front', 'shirt-half-solid-sage-front', 'joggers-solid-white-front'],
  },
  {
    eyebrow: 'Under ₹1,000',
    title: 'Everyday essentials, honest prices',
    text: 'Tees, polos and shorts you will wear on repeat.',
    cta: 'Shop under ₹1,000',
    to: '/shop?maxPrice=99999&sort=popular',
    tone: 'accent',
    images: ['tee-solid-navy-front', 'tee-oversized-solid-cream-front', 'shorts-solid-khaki-front'],
  },
]

const INTERVAL_MS = 6500

export default function Hero() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (paused || reduceMotion) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), INTERVAL_MS)
    return () => clearInterval(timer)
  }, [paused])

  return (
    <section
      className={styles.hero}
      aria-roledescription="carousel"
      aria-label="Featured collections"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {SLIDES.map((slide, i) => (
        <div
          key={slide.title}
          className={styles.slide}
          data-tone={slide.tone}
          data-active={i === index}
          aria-hidden={i !== index}
          inert={i === index ? undefined : ''}
        >
          <div className={`container ${styles.inner}`}>
            <div className={styles.copy}>
              <p className={styles.eyebrow}>{slide.eyebrow}</p>
              <h1 className={styles.title}>{slide.title}</h1>
              <p className={styles.text}>{slide.text}</p>
              <Link to={slide.to} className={`btn ${slide.tone === 'light' ? 'btn-primary' : styles.ctaLight}`}>
                {slide.cta} <Icon name="arrowRight" size={16} />
              </Link>
            </div>
            <div className={styles.collage} aria-hidden="true">
              {slide.images.map((name, n) => (
                <img key={name} src={`/images/products/${name}.svg`} alt="" className={styles[`img${n}`]} loading={i === 0 ? 'eager' : 'lazy'} />
              ))}
            </div>
          </div>
        </div>
      ))}

      <div className={styles.dots}>
        {SLIDES.map((slide, i) => (
          <button
            key={slide.title}
            className={styles.dot}
            data-active={i === index}
            onClick={() => setIndex(i)}
            aria-label={`Show slide ${i + 1}: ${slide.title}`}
            aria-current={i === index}
          />
        ))}
      </div>
    </section>
  )
}
