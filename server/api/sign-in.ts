import * as argon2 from '@node-rs/argon2'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const db = useDB()

  // Определяем, это email или username
  const isEmail = body.login.includes('@')

  // Ищем пользователя по email или username
  const user = await db.query.userTable.findFirst({
    where: (userTable, { eq }) => {
      if (isEmail) {
        return eq(userTable.email, body.login)
      }
      return eq(userTable.username, body.login)
    },
  })

  // Если пользователь не найден
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Invalid credentials',
    })
  }

  // Проверяем пароль с использованием Argon2
  const isPasswordValid = await argon2.verify(user.passwordHash, body.password)

  if (!isPasswordValid) {
    throw createError({
      statusCode: 401,
      message: 'Invalid credentials',
    })
  }

  const { passwordHash, ...userWithoutPassword } = user

  await setUserSession(event, {
    user: { ...userWithoutPassword },
  })

  return {
    status: true,
  }
})
