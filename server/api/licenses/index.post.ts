import { z } from 'zod'

const createLicenseSchema = z.object({
  key: z.string().min(1).max(255).optional(),
  mod: z.string().min(1).max(32),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  policy: z.enum(['key', 'time', 'open']).default('key'),
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

  const body = await readBody(event)
  const validated = createLicenseSchema.parse(body)

  const db = useDB()

  // Генерируем уникальный ключ если не указан
  const licenseKey = validated.key || generateLicenseKey()

  // Проверяем на дубликаты
  const existing = await db.query.licenseKeyTable.findFirst({
    where: (licenseKeyTable, { eq }) => eq(licenseKeyTable.key, licenseKey),
  })

  if (existing) {
    throw createError({
      statusCode: 400,
      message: 'License key already exists',
    })
  }

  const { licenseKeyTable } = tables

  const [newLicense] = await db.insert(licenseKeyTable).values({
    key: licenseKey,
    mod: validated.mod,
    description: validated.description,
    status: validated.status,
    policy: validated.policy,
    expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : null,
  }).returning()

  return newLicense
})

// Генерация уникального ключа формата: XXXX-XXXX-XXXX-XXXX
function generateLicenseKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const segments = 4
  const segmentLength = 4

  const key = Array.from({ length: segments }, () => {
    return Array.from({ length: segmentLength }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))).join('')
  }).join('-')

  return key
}
