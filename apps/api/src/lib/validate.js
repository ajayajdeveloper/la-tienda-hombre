import { badRequest } from './httpError.js'

// Parse `input` with a zod schema or throw a 400 listing every invalid field.
// Returning the parsed value matters: zod applies defaults and coercions
// (e.g. "2" -> 2 for query strings), so handlers must use the result, not the raw input.
export function validate(schema, input) {
  const result = schema.safeParse(input)
  if (!result.success) {
    const fields = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }))
    throw badRequest('validation failed', fields)
  }
  return result.data
}
