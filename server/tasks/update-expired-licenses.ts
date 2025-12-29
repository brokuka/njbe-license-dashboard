import { and, eq, lt } from 'drizzle-orm'

export default defineTask({
  meta: {
    name: 'update-expired-licenses',
    description: 'Обновляет статус истёкших лицензий на inactive',
  },
  async run() {
    console.warn('[Task] Checking for expired licenses...')

    const db = useDB()
    const { licenseKeyTable } = tables

    try {
      // Находим все активные лицензии с истёкшим сроком
      const now = new Date()

      const result = await db
        .update(licenseKeyTable)
        .set({
          status: 'inactive',
          updatedAt: now,
        })
        .where(
          and(
            eq(licenseKeyTable.status, 'active'),
            lt(licenseKeyTable.expiresAt, now),
          ),
        )
        .returning()

      if (result.length > 0) {
        console.warn(`[Task] Updated ${result.length} expired license(s) to inactive`)
        result.forEach((license) => {
          console.warn(`  - License ${license.key} (ID: ${license.id})`)
        })
      }
      else {
        console.warn('[Task] No expired licenses found')
      }

      return { result: 'success', count: result.length }
    }
    catch (error) {
      console.error('[Task] Error updating expired licenses:', error)
      return { result: 'error', error }
    }
  },
})
