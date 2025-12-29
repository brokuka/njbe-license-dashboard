import { defineConfig } from 'drizzle-kit'
import { env } from './config/env'

export default defineConfig({
  out: './server/database/migrations',
  schema: './server/database/schema/**/*.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.NUXT_DATABASE_URL,
  },
})
