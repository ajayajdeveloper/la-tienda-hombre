import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useEscapeKey, useScrollLock } from '../../lib/hooks.js'
import Icon from './Icon.jsx'
import styles from './Overlay.module.css'

/**
 * Side panel (cart, mobile menu, mobile filters). Rendered through a portal
 * into <body>, so a parent's `overflow: hidden` or `transform` can't clip it.
 * Stays mounted and animates with CSS; `inert` stops keyboard focus from
 * reaching it while closed.
 */
export default function Drawer({ open, onClose, side = 'right', title, children, footer, width = 420 }) {
  const panelRef = useRef(null)
  const returnFocusRef = useRef(null)
  useScrollLock(open)
  useEscapeKey(open, onClose)

  // Move focus into the drawer on open, and back to the trigger on close.
  useEffect(() => {
    if (open) {
      returnFocusRef.current = document.activeElement
      panelRef.current?.focus()
    } else if (returnFocusRef.current) {
      returnFocusRef.current.focus?.()
      returnFocusRef.current = null
    }
  }, [open])

  return createPortal(
    <div className={styles.root} data-open={open} inert={open ? undefined : ''}>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <aside
        ref={panelRef}
        className={`${styles.drawer} ${styles[side]}`}
        style={{ '--drawer-w': `${width}px` }}
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
        <div className={styles.drawerBody}>{children}</div>
        {footer && <footer className={styles.drawerFooter}>{footer}</footer>}
      </aside>
    </div>,
    document.body
  )
}
