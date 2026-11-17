import { useEffect, useState } from 'react'

/** The value, but only after it has stopped changing for `delay` ms (search typeahead). */
export function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

/** Lock page scroll while an overlay is open. Counts locks so nested overlays don't unlock early. */
let lockCount = 0
export function useScrollLock(active) {
  useEffect(() => {
    if (!active) return
    lockCount += 1
    document.body.classList.add('scroll-locked')
    return () => {
      lockCount -= 1
      if (lockCount === 0) document.body.classList.remove('scroll-locked')
    }
  }, [active])
}

/** Call `onEscape` when the Escape key is pressed, while `active`. */
export function useEscapeKey(active, onEscape) {
  useEffect(() => {
    if (!active) return
    const handler = (event) => {
      if (event.key === 'Escape') onEscape()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [active, onEscape])
}

/** localStorage-backed state for small per-device preferences (grid density, last pincode). */
export function useStoredState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved === null ? initial : JSON.parse(saved)
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // ignore
    }
  }, [key, value])
  return [value, setValue]
}

/** Set the browser tab title for the current page. */
export function useDocumentTitle(title) {
  useEffect(() => {
    if (title) document.title = `${title} | La Tienda Hombre`
  }, [title])
}

/** Copy text and report success, falling back gracefully where the Clipboard API is blocked. */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
