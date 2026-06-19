import process from 'node:process'
import { drizzle } from 'drizzle-orm/postgres-js'
import { env } from '../../config/env'
import { ensureAdminUser } from './admin'
import * as schema from './schema/user'

const db = drizzle({
  connection: env.NUXT_DATABASE_URL,
  schema,
})

async function seed() {
  const created = await ensureAdminUser(db, {
    username: env.NUXT_ADMIN_USERNAME,
    password: env.NUXT_ADMIN_PASSWORD,
    email: env.NUXT_ADMIN_EMAIL,
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
