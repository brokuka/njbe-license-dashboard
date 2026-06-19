import { z } from 'zod'

// Add a whole-IP ban (port-independent, global). Admin-only.
const banIpSchema = z.object({
  ip: z.string().min(1).max(64),
})

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  if (!session.user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  const body = await readBody(event)
  const { ip } = banIpSchema.parse(body)

  const db = useDB()
  const { bannedIpTable } = tables

  const [banned] = await db.insert(bannedIpTable)
    .values({ ip })
    .onConflictDoNothing({ target: bannedIpTable.ip })
    .returning()

  return banned ?? { ip, alreadyBanned: true }
})
