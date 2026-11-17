import 'dotenv/config'
import { z } from 'zod'

// All environment access goes through this module. If a required variable is
// missing or malformed the process exits at boot with a clear message, instead
// of failing later on the first request that happens to need it.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),
  // Comma-separated list of allowed browser origins. Empty = same-origin only
  // (the production setup, where nginx serves the web app and proxies /api).
  WEB_ORIGIN: z.string().default(''),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  // Behind a reverse proxy (nginx, Render), trust X-Forwarded-For so rate
  // limiting sees the real client IP instead of the proxy's.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment configuration:')
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`)
  }
  process.exit(1)
}

const env = parsed.data

export const config = {
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  dbPoolMax: env.DB_POOL_MAX,
  webOrigins: env.WEB_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean),
  trustProxy: env.TRUST_PROXY,
}
