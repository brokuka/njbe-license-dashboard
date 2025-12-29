import { drizzle } from 'drizzle-orm/postgres-js'
import { env } from '~~/config/env'
import * as licenseKeySchema from '../database/schema/license-key'
import * as userSchema from '../database/schema/user'

const schema = { ...userSchema, ...licenseKeySchema }

export { and, eq, gt, gte, ilike, inArray, like, lt, lte, not, or, sql } from 'drizzle-orm'

export const tables = schema

const db = drizzle({
  connection: env.NUXT_DATABASE_URL,
  schema,
})

export function useDB() {
  return db
}
