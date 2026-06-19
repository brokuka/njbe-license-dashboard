import { integer, pgEnum, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'

export const licenseKeyStatusEnum = pgEnum('license_key_status', ['active', 'inactive'])

// Licensing policy controlled from the dashboard:
//   key  — licensed while status is 'active'
//   time — licensed while status is 'active' AND not past expiresAt
//   open — always licensed (licensing requirement disabled for this server)
export const licenseKeyPolicyEnum = pgEnum('license_key_policy', ['key', 'time', 'open'])

export const licenseKeyTable = pgTable('license_key', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  key: varchar({ length: 255 }).notNull().unique(),
  // Mod family this key belongs to (the site serves multiple mods: nhnse, njbe, surf, ...).
  // Free-form text (not an enum) so new mods can be added without a schema migration.
  mod: varchar({ length: 32 }).notNull().default('nhnse'),
  description: text(),
  status: licenseKeyStatusEnum().default('active').notNull(),
  policy: licenseKeyPolicyEnum().default('key').notNull(),
  expiresAt: timestamp(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
})
