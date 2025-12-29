export default defineEventHandler(async (event) => {
  const key = getRouterParam(event, 'id')
  if (!key) {
    throw createError({
      statusCode: 400,
      message: 'License key is required',
    })
  }

  const db = useDB()
  const license = await db.query.licenseKeyTable.findFirst({
    where: (licenseKeyTable, { eq }) => eq(licenseKeyTable.key, key),
  })

  if (!license) {
    throw createError({
      statusCode: 404,
      message: 'License not found',
    })
  }

  return license
})
