// An error that knows which HTTP status it maps to. Route and service code
// throws these; the central error handler turns them into JSON responses.
// Anything that is NOT an HttpError is treated as a bug and becomes a 500.
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.details = details
  }
}

export const badRequest = (message, details) => new HttpError(400, message, details)
export const notFound = (message = 'not found') => new HttpError(404, message)
export const conflict = (message, details) => new HttpError(409, message, details)
