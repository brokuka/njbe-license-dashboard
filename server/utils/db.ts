import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as licenseKeySchema from '../database/schema/license-key'
import * as serverSchema from '../database/schema/server'
import * as userSchema from '../database/schema/user'

const schema = { ...userSchema, ...licenseKeySchema, ...serverSchema }

export { and, eq, gt, gte, ilike, inArray, like, lt, lte, not, or, sql } from 'drizzle-orm'

export const tables = schema

let _db: PostgresJsDatabase<typeof schema> | undefined

export function useDB() {
  if (!_db) {
    _db = drizzle({
      connection: useRuntimeConfig().databaseUrl,
      schema,
    })
  }

  return _db
}
