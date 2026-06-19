import { desc, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  if (!session.user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  const db = useDB()
  const { serverTable, licenseKeyTable } = tables

  // Manual join (no drizzle relations configured) — return telemetry + its license fields.
  const servers = await db
    .select({
      id: serverTable.id,
      ip: serverTable.ip,
      hostname: serverTable.hostname,
      map: serverTable.map,
      players: serverTable.players,
      maxplayers: serverTable.maxplayers,
      version: serverTable.version,
      lastSeenAt: serverTable.lastSeenAt,
      createdAt: serverTable.createdAt,
      key: licenseKeyTable.key,
      mod: licenseKeyTable.mod,
      status: licenseKeyTable.status,
      policy: licenseKeyTable.policy,
      expiresAt: licenseKeyTable.expiresAt,
    })
    .from(serverTable)
    .leftJoin(licenseKeyTable, eq(serverTable.licenseKeyId, licenseKeyTable.id))
    .orderBy(desc(serverTable.lastSeenAt))

  return servers
})
