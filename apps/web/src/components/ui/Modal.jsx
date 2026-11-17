import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useEscapeKey, useScrollLock } from '../../lib/hooks.js'
import Icon from './Icon.jsx'
import styles from './Overlay.module.css'

/** Centred dialog (size guide, image zoom, write a review). Mounted only while open. */
export default function Modal({ open, onClose, title, children, wide = false }) {
  const panelRef = useRef(null)
  useScrollLock(open)
  useEscapeKey(open, onClose)

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement
    panelRef.current?.focus()
    return () => previous?.focus?.()
  }, [open])

  if (!open) return null

  return createPortal(
    <div className={styles.root} data-open="true">
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className={`${styles.modal} ${wide ? styles.modalWide : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <header className={styles.drawerHeader}>
          <h2 className={styles.drawerTitle}>{title}</h2>
          <button className={styles.close} onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </header>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>,
    document.body
  )
}
