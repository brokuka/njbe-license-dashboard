import { eq } from 'drizzle-orm'
import { z } from 'zod'

// Per-server override controls (admin-only). Lets a single server deviate from its shared key:
//   blocked           — hard ban for this server
//   policyOverride     — null clears the override (inherit the key's policy)
//   overrideExpiresAt  — expiry used when the effective policy is 'time'; null clears it
const updateServerSchema = z.object({
  blocked: z.boolean().optional(),
  policyOverride: z.enum(['key', 'time', 'open']).nullable().optional(),
  overrideExpiresAt: z.string().datetime().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  if (!session.user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Server ID is required',
    })
  }

  const body = await readBody(event)
  const validated = updateServerSchema.parse(body)

  const db = useDB()
  const { serverTable } = tables

  // Проверяем существование сервера
  const existing = await db.query.serverTable.findFirst({
    where: (serverTable, { eq }) => eq(serverTable.id, Number(id)),
  })

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'Server not found',
    })
  }

  // Используем `key in validated`, чтобы явный null (сброс override) не отбрасывался.
  const [updatedServer] = await db.update(serverTable)
    .set({
      ...('blocked' in validated && { blocked: validated.blocked }),
      ...('policyOverride' in validated && { policyOverride: validated.policyOverride }),
      ...('overrideExpiresAt' in validated && {
        overrideExpiresAt: validated.overrideExpiresAt ? new Date(validated.overrideExpiresAt) : null,
      }),
    })
    .where(eq(serverTable.id, Number(id)))
    .returning()

  return updatedServer
})
