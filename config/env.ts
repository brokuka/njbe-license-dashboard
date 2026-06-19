import process from 'node:process'
import { createEnv } from '@t3-oss/env-nuxt'
import { z } from 'zod'

// Ensure .env is loaded for tools that evaluate this module outside the Nuxt
// runtime (knip, drizzle-kit). At runtime the vars are already set, so this is
// a no-op; in production (no .env file) the call is ignored.
try {
  process.loadEnvFile?.()
}
catch {}

export const env = createEnv({
  server: {
    NUXT_SESSION_PASSWORD: z.string(),
    NUXT_DATABASE_URL: z.string(),
    NUXT_ADMIN_USERNAME: z.string(),
    NUXT_ADMIN_PASSWORD: z.string(),
    NUXT_ADMIN_EMAIL: z.string().optional(),
  },
})
