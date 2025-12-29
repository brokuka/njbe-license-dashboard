import process from 'node:process'
import { hash } from '@node-rs/argon2'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { env } from '../../config/env'
import * as schema from './schema/user'

const db = drizzle({
  connection: env.NUXT_DATABASE_URL,
  schema,
})

async function seed() {
  // Проверяем, существует ли уже пользователь
  const existingUser = await db.query.userTable.findFirst({
    where: eq(schema.userTable.username, env.NUXT_ADMIN_USERNAME),
  })

  if (existingUser) {
    return
  }

  // Хешируем пароль
  const passwordHash = await hash(env.NUXT_ADMIN_PASSWORD, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  })

  // Создаем администратора
  await db.insert(schema.userTable).values({
    username: env.NUXT_ADMIN_USERNAME,
    email: env.NUXT_ADMIN_EMAIL,
    role: 'admin',
    age: 30,
    passwordHash,
  })
}

seed()
  .catch((error) => {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  })
  .finally(() => {
    process.exit(0)
  })
