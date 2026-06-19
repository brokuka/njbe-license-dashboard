import { z } from 'zod'

// Public endpoint — called server-to-server by the game server (no user session).
// Receives telemetry, upserts the server row, and returns the dashboard-controlled policy.
const heartbeatSchema = z.object({
  key: z.string().min(1).max(255),
  mod: z.string().max(32).optional().default(''),
  ip: z.string().max(64).optional().default(''),
  hostname: z.string().max(191).optional().default(''),
  map: z.string().max(64).optional().default(''),
  players: z.number().int().min(0).max(64).optional().default(0),
  maxplayers: z.number().int().min(0).max(64).optional().default(0),
  version: z.string().max(64).optional().default(''),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = heartbeatSchema.parse(body)

  const db = useDB()
  const { licenseKeyTable, serverTable } = tables

  const license = await db.query.licenseKeyTable.findFirst({
    where: (licenseKeyTable, { eq }) => eq(licenseKeyTable.key, data.key),
  })

  // Unknown key → reply 200 with an explicit deny so the game server applies it
  // (a non-200 would be treated as a network error and trigger its fail-open grace).
  if (!license) {
    return { licensed: false, policy: 'key', expiresAt: null, message: 'Unknown license key' }
  }

  // Key is bound to one mod: reject if the server reports a different mod.
  if (data.mod && license.mod !== data.mod) {
    return { licensed: false, policy: license.policy, expiresAt: license.expiresAt, message: `Key belongs to mod '${license.mod}', not '${data.mod}'` }
  }

  // Upsert telemetry (1 server = 1 key).
  const now = new Date()
  const telemetry = {
    ip: data.ip,
    hostname: data.hostname,
    map: data.map,
    players: data.players,
    maxplayers: data.maxplayers,
    version: data.version,
    lastSeenAt: now,
  }

  await db.insert(serverTable)
    .values({ licenseKeyId: license.id, ...telemetry })
    .onConflictDoUpdate({ target: serverTable.licenseKeyId, set: telemetry })

  // Decide licensing from the dashboard-controlled policy.
  let licensed: boolean
  switch (license.policy) {
    case 'open':
      licensed = true
      break
    case 'time':
      licensed = license.status === 'active' && (!license.expiresAt || new Date(license.expiresAt) > now)
      break
    case 'key':
    default:
      licensed = license.status === 'active'
      break
  }

  return {
    licensed,
    policy: license.policy,
    expiresAt: license.expiresAt,
    message: '',
  }
})
