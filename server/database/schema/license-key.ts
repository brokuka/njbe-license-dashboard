import { integer, pgEnum, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'

export const licenseKeyStatusEnum = pgEnum('license_key_status', ['active', 'inactive'])

export const licenseKeyTable = pgTable('license_key', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  key: varchar({ length: 255 }).notNull().unique(),
  description: text(),
  status: licenseKeyStatusEnum().default('active').notNull(),
  expiresAt: timestamp(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
})
