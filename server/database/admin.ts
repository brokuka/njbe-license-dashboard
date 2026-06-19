import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { hash } from '@node-rs/argon2'
import { eq } from 'drizzle-orm'
import { userTable } from './schema/user'

interface AdminCredentials {
  username: string
  password: string
  email?: string
}

/**
 * Создаёт пользователя-администратора, если его ещё нет.
 * Идемпотентна — безопасно вызывать на каждом старте сервера.
 * @returns true, если администратор был создан, иначе false
 */
export async function ensureAdminUser(
  db: PostgresJsDatabase<any>,
  { username, password, email }: AdminCredentials,
): Promise<boolean> {
  const [existing] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.username, username))
    .limit(1)

  if (existing)
    return false

  const passwordHash = await hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  })

  await db.insert(userTable).values({
    username,
    email,
    role: 'admin',
    age: 30,
    passwordHash,
  })

  return true
}
