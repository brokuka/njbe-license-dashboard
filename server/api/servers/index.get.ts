import { desc, eq, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  if (!session.user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  const db = useDB()
  const { serverTable, licenseKeyTable, bannedIpTable } = tables

  // Manual join (no drizzle relations configured) — return telemetry + its license fields.
  // `ipBanned` reflects the whole-IP (port-independent) ban list joined on the bare host.
  const servers = await db
    .select({
      id: serverTable.id,
      ip: serverTable.ip,
      host: serverTable.host,
      hostname: serverTable.hostname,
      map: serverTable.map,
      players: serverTable.players,
      maxplayers: serverTable.maxplayers,
      version: serverTable.version,
      blocked: serverTable.blocked,
      policyOverride: serverTable.policyOverride,
      overrideExpiresAt: serverTable.overrideExpiresAt,
      lastSeenAt: serverTable.lastSeenAt,
      createdAt: serverTable.createdAt,
      key: licenseKeyTable.key,
      mod: licenseKeyTable.mod,
      status: licenseKeyTable.status,
      policy: licenseKeyTable.policy,
      expiresAt: licenseKeyTable.expiresAt,
      ipBanned: sql<boolean>`${bannedIpTable.id} is not null`,
    })
    .from(serverTable)
    .leftJoin(licenseKeyTable, eq(serverTable.licenseKeyId, licenseKeyTable.id))
    .leftJoin(bannedIpTable, eq(bannedIpTable.ip, serverTable.host))
    .orderBy(desc(serverTable.lastSeenAt))

  return servers
})
