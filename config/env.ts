import { createEnv } from '@t3-oss/env-nuxt'
import { z } from 'zod'

export const env = createEnv({
  server: {
    NUXT_SESSION_PASSWORD: z.string(),
    NUXT_DATABASE_URL: z.string(),
    NUXT_ADMIN_USERNAME: z.string(),
    NUXT_ADMIN_PASSWORD: z.string(),
    NUXT_ADMIN_EMAIL: z.string().optional(),
  },
})
