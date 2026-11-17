import { Suspense, useCallback, useEffect } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { closeOverlay, selectOverlay } from '../../store/uiSlice.js'
import PromoBar from './PromoBar.jsx'
import Header from './Header.jsx'
import Footer from './Footer.jsx'
import CartDrawer from './CartDrawer.jsx'
import SearchOverlay from './SearchOverlay.jsx'
import MobileNav from './MobileNav.jsx'
import { ErrorBoundary, Skeleton, Toast } from '../ui/Feedback.jsx'
import styles from './Layout.module.css'

/** The shell around every page: header, overlays, footer. Pages render in <Outlet />. */
export default function Layout() {
  const overlay = useSelector(selectOverlay)
  const dispatch = useDispatch()
  const location = useLocation()
  const close = useCallback(() => dispatch(closeOverlay()), [dispatch])

  // Navigating anywhere closes whatever overlay was open.
  useEffect(() => {
    dispatch(closeOverlay())
  }, [location.pathname, dispatch])

  return (
    <>
      <a href="#main" className={styles.skip}>
        Skip to content
      </a>
      <PromoBar />
      <Header />
      <main id="main" className={styles.main}>
        {/* resetKey: navigating clears a page's error state. */}
        <ErrorBoundary resetKey={location.pathname}>
          {/* Pages are lazy-loaded; this shows while a page's code downloads. */}
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />

      <CartDrawer open={overlay === 'cart'} onClose={close} />
      <SearchOverlay open={overlay === 'search'} onClose={close} />
      <MobileNav open={overlay === 'menu'} onClose={close} />
      <Toast />
      {/* Restores scroll on Back, scrolls to top on new pages. */}
      <ScrollRestoration getKey={(loc) => loc.pathname + loc.search} />
    </>
  )
}

function PageFallback() {
  return (
    <div className="container page">
      <Skeleton width="40%" height="2rem" />
    </div>
  )
}
