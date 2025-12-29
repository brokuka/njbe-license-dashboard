export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  if (!session.user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  try {
    // Запускаем задачу вручную
    const result = await runTask('update-expired-licenses')

    return {
      success: true,
      message: 'Task executed successfully',
      result,
    }
  }
  catch (error) {
    throw createError({
      statusCode: 500,
      message: 'Failed to run task',
      data: error,
    })
  }
})
