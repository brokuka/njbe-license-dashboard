export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  if (!session.user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  const db = useDB()
  const licenses = await db.query.licenseKeyTable.findMany({
    orderBy: (licenseKeyTable, { desc }) => [desc(licenseKeyTable.createdAt)],
  })

  return licenses
})
