import process from 'node:process'
import { drizzle } from 'drizzle-orm/postgres-js'
import { ensureAdminUser } from './admin'
import * as schema from './schema/user'

// Standalone-скрипт (`bun run db:seed`) — bun сам подгружает .env в process.env.
const db = drizzle({
  connection: process.env.NUXT_DATABASE_URL!,
  schema,
})

async function seed() {
  const created = await ensureAdminUser(db, {
    username: process.env.NUXT_ADMIN_USERNAME!,
    password: process.env.NUXT_ADMIN_PASSWORD!,
    email: process.env.NUXT_ADMIN_EMAIL,
  })

  console.warn(created ? '✅ Admin user created' : 'ℹ️  Admin user already exists')
}

seed()
  .catch((error) => {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  })
  .finally(() => {
    process.exit(0)
  })
