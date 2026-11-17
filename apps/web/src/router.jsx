import { lazy } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import Layout from './components/layout/Layout.jsx'

// Route-level code splitting: each page's code is a separate file that is
// downloaded the first time that page is visited. The homepage doesn't pay
// for the checkout form's code.
const Home = lazy(() => import('./pages/Home.jsx'))
const Listing = lazy(() => import('./pages/Listing.jsx'))
const ProductDetail = lazy(() => import('./pages/ProductDetail.jsx'))
const Cart = lazy(() => import('./pages/Cart.jsx'))
const Checkout = lazy(() => import('./pages/Checkout.jsx'))
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation.jsx'))
const Wishlist = lazy(() => import('./pages/Wishlist.jsx'))
const Help = lazy(() => import('./pages/Help.jsx'))
const NotFound = lazy(() => import('./pages/NotFound.jsx'))

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      // One Listing page serves four URL shapes; it reads which one from the params.
      { path: '/shop', element: <Listing mode="shop" /> },
      { path: '/c/:slug', element: <Listing mode="category" /> },
      { path: '/collections/:slug', element: <Listing mode="collection" /> },
      { path: '/search', element: <Listing mode="search" /> },
      { path: '/products/:slug', element: <ProductDetail /> },
      { path: '/cart', element: <Cart /> },
      { path: '/checkout', element: <Checkout /> },
      { path: '/orders/:publicId', element: <OrderConfirmation /> },
      { path: '/wishlist', element: <Wishlist /> },
      { path: '/help', element: <Help /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])
