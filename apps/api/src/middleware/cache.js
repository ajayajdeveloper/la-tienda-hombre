// Let browsers (and any CDN in front of us) reuse a GET response for a few
// seconds. Catalogue data changes rarely, so 30-60s of staleness is invisible
// to shoppers but removes most repeat requests during a browsing session.
// Express also adds an ETag, so after expiry the browser revalidates and gets
// a tiny 304 if nothing changed.
export function cacheFor(seconds) {
  return (req, res, next) => {
    res.set('Cache-Control', `public, max-age=${seconds}`)
    next()
  }
}
