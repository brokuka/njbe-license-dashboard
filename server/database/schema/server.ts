import { integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core'
import { licenseKeyTable } from './license-key'

// Live telemetry for a game server, reported via POST /api/servers/heartbeat.
// 1 server = 1 license key, so licenseKeyId is unique and the row is upserted on each beat.
export const serverTable = pgTable('server', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  licenseKeyId: integer().notNull().references(() => licenseKeyTable.id, { onDelete: 'cascade' }).unique(),
  ip: varchar({ length: 64 }),
  hostname: varchar({ length: 191 }),
  map: varchar({ length: 64 }),
  players: integer().default(0).notNull(),
  maxplayers: integer().default(0).notNull(),
  version: varchar({ length: 64 }),
  lastSeenAt: timestamp().defaultNow().notNull(),
  createdAt: timestamp().defaultNow().notNull(),
})
