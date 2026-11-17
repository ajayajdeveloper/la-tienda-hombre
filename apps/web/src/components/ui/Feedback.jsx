import { Component, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { dismissToast, selectToast } from '../../store/uiSlice.js'
import Icon from './Icon.jsx'
import styles from './Feedback.module.css'

/** Grey placeholder blocks shown while data loads, so the layout doesn't jump. */
export function Skeleton({ width = '100%', height = '1em', radius, style }) {
  return <span className={styles.skeleton} style={{ width, height, borderRadius: radius, ...style }} aria-hidden="true" />
}

export function EmptyState({ icon = 'bag', title, children, action }) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}>
        <Icon name={icon} size={28} />
      </span>
      <h2 className={styles.emptyTitle}>{title}</h2>
      {children && <p className={styles.emptyText}>{children}</p>}
      {action}
    </div>
  )
}

export function ErrorMessage({ children, onRetry }) {
  return (
    <div className={styles.error} role="alert">
      <p>{children}</p>
      {onRetry && (
        <button className="btn btn-outline btn-sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

/** One toast at a time, auto-dismissed. Driven by the ui slice so any component can trigger it. */
export function Toast() {
  const toast = useSelector(selectToast)
  const dispatch = useDispatch()

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => dispatch(dismissToast()), 3200)
    return () => clearTimeout(timer)
  }, [toast, dispatch])

  return (
    <div className={styles.toastRegion} aria-live="polite">
      {toast && (
        <div key={toast.id} className={styles.toast} data-tone={toast.tone}>
          <Icon name={toast.tone === 'error' ? 'close' : 'check'} size={18} />
          {toast.message}
        </div>
      )}
    </div>
  )
}

/**
 * Catches render errors anywhere below it and shows a fallback instead of a
 * blank white page. It has to be a class component: React has no hook
 * equivalent of componentDidCatch.
 */
export class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // In production this is where you'd report to an error tracker (Sentry etc.).
    console.error('Render error', error, info.componentStack)
  }

  componentDidUpdate(prevProps) {
    // Navigating to another page clears the error.
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="container page">
        <EmptyState
          icon="close"
          title="Something went wrong on this page"
          action={
            <Link to="/" className="btn btn-primary" onClick={() => this.setState({ error: null })}>
              Back to the homepage
            </Link>
          }
        >
          It's not you. Please refresh, or try again in a moment.
        </EmptyState>
      </div>
    )
  }
}
