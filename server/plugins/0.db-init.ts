import { env } from '~~/config/env'
import { ensureAdminUser } from '../database/admin'

/**
 * Запускается один раз при старте сервера (Nitro).
 * Гарантирует наличие администратора в базе — поэтому на проде его больше
 * не нужно создавать вручную через `bun run db:seed`.
 *
 * Схема накатывается отдельно командой `bun run db:migrate` (на деплое),
 * здесь мы только досеживаем данные.
 */
export default defineNitroPlugin(async () => {
  try {
    const created = await ensureAdminUser(useDB(), {
      username: env.NUXT_ADMIN_USERNAME,
      password: env.NUXT_ADMIN_PASSWORD,
      email: env.NUXT_ADMIN_EMAIL,
    })

    if (created)
      console.warn('[db-init] Администратор создан')
  }
  catch (error) {
    // Не валим приложение, если, например, миграции ещё не накатаны
    console.error('[db-init] Не удалось создать администратора:', error)
  }
})
