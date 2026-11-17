// One line per request: method, path, status, duration. Enough to debug a
// production issue from the platform's log viewer without adding a logging
// library. Health checks are skipped because load balancers hit them constantly.
export function requestLogger(req, res, next) {
  if (req.path === '/healthz' || req.path === '/livez') return next()

  const start = process.hrtime.bigint()
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms`)
  })
  next()
}
