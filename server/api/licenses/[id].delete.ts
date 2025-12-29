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

  const db = useDB()
  const { licenseKeyTable } = tables

  // Проверяем существование ключа
  const existing = await db.query.licenseKeyTable.findFirst({
    where: (licenseKeyTable, { eq }) => eq(licenseKeyTable.id, Number.parseInt(id)),
  })

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'License key not found',
    })
  }

  // Удаляем ключ
  await db.delete(licenseKeyTable)
    .where(eq(licenseKeyTable.id, Number.parseInt(id)))

  return {
    success: true,
  }
})
