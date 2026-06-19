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
  const { serverTable } = tables

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

  // The game server can't know its own public IP — `data.ip` is its bind address (net_address),
  // which is usually "0.0.0.0:27015" when HLDS is started without -ip. So derive the real IP from
  // the request's source address (X-Forwarded-For first, since we run behind Vercel's proxy) and
  // keep the game port the server reported in `data.ip` ("0.0.0.0:27015" -> port 27015).
  const sourceIp = (getRequestIP(event, { xForwardedFor: true }) || '').replace(/^::ffff:/, '')
  const portMatch = data.ip.match(/:(\d{1,5})$/)
  const resolvedIp = sourceIp
    ? (portMatch ? `${sourceIp}:${portMatch[1]}` : sourceIp)
    : data.ip

  // Upsert telemetry. One key may be shared across many servers, so the row is identified by
  // (licenseKeyId, ip). The `set` only touches telemetry fields, so admin-controlled overrides
  // (blocked / policyOverride / overrideExpiresAt) persist across beats.
  const now = new Date()
  const telemetry = {
    ip: resolvedIp,
    hostname: data.hostname,
    map: data.map,
    players: data.players,
    maxplayers: data.maxplayers,
    version: data.version,
    lastSeenAt: now,
  }

  const [server] = await db.insert(serverTable)
    .values({ licenseKeyId: license.id, ...telemetry })
    .onConflictDoUpdate({ target: [serverTable.licenseKeyId, serverTable.ip], set: telemetry })
    .returning()

  // Effective licensing: per-server override (if any) layered over the key's base policy.
  const effectivePolicy = server.policyOverride ?? license.policy
  const effectiveExpiresAt = server.overrideExpiresAt ?? license.expiresAt

  let licensed: boolean
  if (server.blocked) {
    licensed = false
  }
  else {
    switch (effectivePolicy) {
      case 'open':
        licensed = true
        break
      case 'time':
        licensed = license.status === 'active' && (!effectiveExpiresAt || new Date(effectiveExpiresAt) > now)
        break
      case 'key':
      default:
        licensed = license.status === 'active'
        break
    }
  }

  return {
    licensed,
    policy: effectivePolicy,
    expiresAt: effectiveExpiresAt,
    message: '',
  }
})
