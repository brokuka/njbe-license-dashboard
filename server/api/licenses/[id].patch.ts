import { eq } from 'drizzle-orm'
import { z } from 'zod'

const updateLicenseSchema = z.object({
  key: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  expiresAt: z.string().datetime().optional(),
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
      message: 'License ID is required',
    })
  }

  const body = await readBody(event)
  const validated = updateLicenseSchema.parse(body)

  const db = useDB()
  const { licenseKeyTable } = tables

  // Проверяем существование лицензии
  const existing = await db.query.licenseKeyTable.findFirst({
    where: (licenseKeyTable, { eq }) => eq(licenseKeyTable.id, Number(id)),
  })

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'License not found',
    })
  }

  // Обновляем лицензию
  const [updatedLicense] = await db.update(licenseKeyTable)
    .set({
      ...(validated.key && { key: validated.key }),
      ...(validated.description !== undefined && { description: validated.description }),
      ...(validated.status && { status: validated.status }),
      ...(validated.expiresAt && { expiresAt: new Date(validated.expiresAt) }),
      updatedAt: new Date(),
    })
    .where(eq(licenseKeyTable.id, Number(id)))
    .returning()

  return updatedLicense
})
