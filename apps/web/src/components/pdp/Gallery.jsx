import { useState } from 'react'
import Modal from '../ui/Modal.jsx'
import Icon from '../ui/Icon.jsx'
import styles from './Gallery.module.css'

/**
 * Desktop: vertical thumbnails + large image. Mobile: one swipeable row
 * (scroll-snap) with dots. Clicking the image opens a zoom modal.
 * The parent passes only the images for the selected colour.
 */
export default function Gallery({ images, name }) {
  const [active, setActive] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const current = images[Math.min(active, images.length - 1)]

  return (
    <div className={styles.gallery}>
      <ul className={styles.thumbs} aria-label="Product images">
        {images.map((image, i) => (
          <li key={image.url}>
            <button className={styles.thumb} aria-current={i === active} onClick={() => setActive(i)} aria-label={`Show image ${i + 1}`}>
              <img src={image.url} alt="" />
            </button>
          </li>
        ))}
      </ul>

      <button className={styles.main} onClick={() => setZoomed(true)} aria-label="Zoom image">
        <img src={current?.url} alt={current?.alt ?? name} />
        <span className={styles.zoomHint}>
          <Icon name="search" size={16} /> Tap to zoom
        </span>
      </button>

      {/* Mobile swipe row */}
      <div
        className={styles.swipe}
        onScroll={(e) => {
          const el = e.currentTarget
          setActive(Math.round(el.scrollLeft / el.clientWidth))
        }}
      >
        {images.map((image) => (
          <img key={image.url} src={image.url} alt={image.alt} onClick={() => setZoomed(true)} />
        ))}
      </div>
      <div className={styles.dots} aria-hidden="true">
        {images.map((image, i) => (
          <span key={image.url} data-active={i === active} />
        ))}
      </div>

      <Modal open={zoomed} onClose={() => setZoomed(false)} title={name} wide>
        <div className={styles.zoomGrid}>
          {images.map((image) => (
            <img key={image.url} src={image.url} alt={image.alt} />
          ))}
        </div>
      </Modal>
    </div>
  )
}
