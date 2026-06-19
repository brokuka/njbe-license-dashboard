import { boolean, integer, pgTable, timestamp, unique, varchar } from 'drizzle-orm/pg-core'
import { licenseKeyPolicyEnum, licenseKeyTable } from './license-key'

// Live telemetry for a game server, reported via POST /api/servers/heartbeat.
// One license key can be shared across many servers (e.g. a free `open` key), so the row is
// identified by (licenseKeyId, ip) and upserted on each beat.
//
// Per-server override fields let the admin deviate a single server from the key's base policy
// without touching the shared key:
//   blocked          — hard ban for this server (licensed: false regardless of policy)
//   policyOverride    — null = inherit the key's policy; otherwise force this policy for this server
//   overrideExpiresAt — expiry used when the effective policy is 'time'
export const serverTable = pgTable('server', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  licenseKeyId: integer().notNull().references(() => licenseKeyTable.id, { onDelete: 'cascade' }),
  // `ip` is the full identity "host:port"; `host` is the bare IP (no port), used for whole-IP bans.
  ip: varchar({ length: 64 }),
  host: varchar({ length: 64 }),
  hostname: varchar({ length: 191 }),
  map: varchar({ length: 64 }),
  players: integer().default(0).notNull(),
  maxplayers: integer().default(0).notNull(),
  version: varchar({ length: 64 }),
  blocked: boolean().default(false).notNull(),
  policyOverride: licenseKeyPolicyEnum(),
  overrideExpiresAt: timestamp(),
  lastSeenAt: timestamp().defaultNow().notNull(),
  createdAt: timestamp().defaultNow().notNull(),
}, t => [unique().on(t.licenseKeyId, t.ip)])

// Whole-IP ban list (port-independent, global across keys). A heartbeat from a banned IP is
// denied regardless of its key/policy or per-server override.
export const bannedIpTable = pgTable('banned_ip', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  ip: varchar({ length: 64 }).notNull().unique(),
  createdAt: timestamp().defaultNow().notNull(),
})
