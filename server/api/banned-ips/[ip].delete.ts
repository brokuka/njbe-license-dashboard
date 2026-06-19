import { eq } from 'drizzle-orm'

// Remove a whole-IP ban. Admin-only.
export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  if (!session.user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  const ip = getRouterParam(event, 'ip')
  if (!ip) {
    throw createError({
      statusCode: 400,
      message: 'IP is required',
    })
  }

  const db = useDB()
  const { bannedIpTable } = tables

  await db.delete(bannedIpTable).where(eq(bannedIpTable.ip, decodeURIComponent(ip)))

  return { success: true }
})
