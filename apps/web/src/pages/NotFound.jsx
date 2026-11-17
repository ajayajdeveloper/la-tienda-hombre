import { Link } from 'react-router-dom'
import { useDocumentTitle } from '../lib/hooks.js'
import { EmptyState } from '../components/ui/Feedback.jsx'

export default function NotFound() {
  useDocumentTitle('Page not found')
  return (
    <div className="container page">
      <EmptyState icon="search" title="This page doesn't exist" action={<Link to="/" className="btn btn-primary">Go to the homepage</Link>}>
        The link may be broken, or the page may have moved.
      </EmptyState>
    </div>
  )
}
