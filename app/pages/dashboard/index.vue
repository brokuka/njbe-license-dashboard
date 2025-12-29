<script setup lang="ts">
interface LicenseKey {
  id: number
  key: string
  description: string | null
  status: 'active' | 'inactive'
  expiresAt: Date | string | null
  createdAt: Date | string
  updatedAt: Date | string
}

interface LicenseFormData {
  key?: string
  description?: string
  status: 'active' | 'inactive'
  expiresAt?: string
}

definePageMeta({
  middleware: 'auth',
})

const { clear, fetch: fetchUser } = useUserSession()

// SSR загрузка лицензий
const { data: licenses } = await useFetch<LicenseKey[]>('/api/licenses', {
  key: 'licenses',
})

// Автоматическое обновление данных каждую минуту
// для синхронизации с cron-задачей обновления истёкших лицензий
const lastRefresh = ref<Date>(new Date())

onMounted(() => {
  const refreshInterval = setInterval(async () => {
    await refreshNuxtData('licenses')
    lastRefresh.value = new Date()
  }, 60000) // каждые 60 секунд

  // Очистка при размонтировании
  onUnmounted(() => {
    clearInterval(refreshInterval)
  })
})

// State для диалога
const isDialogOpen = ref(false)
const isSubmitting = ref(false)

function onLogout() {
  clear()
  fetchUser().then(async () => await navigateTo('/'))
}

async function handleCreateLicense(formData: LicenseFormData) {
  isSubmitting.value = true

  try {
    await $fetch('/api/licenses', {
      method: 'POST',
      body: formData,
    })

    // Обновляем данные после создания
    await refreshNuxtData('licenses')
    lastRefresh.value = new Date()

    isDialogOpen.value = false
  }
  catch (error) {
    console.error('Failed to create license:', error)
  }
  finally {
    isSubmitting.value = false
  }
}

async function handleDeleteLicense(id: number) {
  // eslint-disable-next-line no-alert
  if (!window.confirm('Вы уверены, что хотите удалить этот лицензионный ключ?')) {
    return
  }

  try {
    await $fetch(`/api/licenses/${id}`, {
      method: 'DELETE',
    })

    // Обновляем данные после удаления
    await refreshNuxtData('licenses')
    lastRefresh.value = new Date()
  }
  catch (error) {
    console.error('Failed to delete license:', error)
  }
}

function formatDate(date: Date | string | null) {
  if (!date)
    return '—'
  return new Date(date).toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Tbilisi', // Georgia timezone (GMT+4)
  })
}

function isExpired(expiresAt: Date | string | null) {
  if (!expiresAt)
    return false

  const expiryDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
  const now = new Date()

  return expiryDate < now
}

// Определяет фактический статус с учётом срока действия
function getEffectiveStatus(license: LicenseKey): 'active' | 'inactive' | 'expired' {
  if (license.status === 'inactive')
    return 'inactive'

  if (isExpired(license.expiresAt))
    return 'expired'

  return 'active'
}

// Продление лицензии
const extendingLicenseId = ref<number | null>(null)

async function handleExtendLicense(license: LicenseKey) {
  extendingLicenseId.value = license.id

  try {
    // Продлеваем на 30 дней от текущей даты
    const newExpiryDate = new Date()
    newExpiryDate.setDate(newExpiryDate.getDate() + 30)

    await $fetch(`/api/licenses/${license.id}`, {
      method: 'PATCH',
      body: {
        expiresAt: newExpiryDate.toISOString(),
        status: 'active', // Активируем лицензию при продлении
      },
    })

    // Обновляем данные
    await refreshNuxtData('licenses')
    lastRefresh.value = new Date()
  }
  catch (error) {
    console.error('Failed to extend license:', error)
  }
  finally {
    extendingLicenseId.value = null
  }
}
</script>

<template>
  <div class="min-h-screen bg-linear-to-br from-neutral-950 via-neutral-900 to-orange-950/20">
    <div class="container mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="mb-2 text-4xl font-bold text-orange-500">
            CS 1.6 License Manager
          </h1>
          <p class="text-neutral-400">
            Управление лицензионными ключами сервера Counter-Strike 1.6
          </p>
        </div>
        <UiButton variant="outline" @click="onLogout">
          Выход
        </UiButton>
      </div>

      <!-- Main Card -->
      <UiCard class="border-orange-900/20 bg-neutral-900/50 backdrop-blur">
        <UiCardHeader>
          <div class="flex items-center justify-between">
            <div>
              <UiCardTitle class="text-2xl text-orange-400">
                Лицензионные ключи
              </UiCardTitle>
              <UiCardDescription class="text-neutral-400">
                Всего ключей: {{ licenses?.length }}
                <span class="ml-2 text-xs text-neutral-500">
                  • Обновлено: {{ lastRefresh.toLocaleTimeString('ru-RU') }}
                </span>
              </UiCardDescription>
            </div>

            <UiDialog v-model:open="isDialogOpen">
              <UiDialogTrigger as-child>
                <UiButton class="bg-orange-600 hover:bg-orange-700">
                  <span class="mr-2">+</span> Добавить ключ
                </UiButton>
              </UiDialogTrigger>

              <UiDialogContent class="border-orange-900/30 bg-neutral-900 sm:max-w-md">
                <UiDialogHeader>
                  <UiDialogTitle class="text-orange-400">
                    Новый лицензионный ключ
                  </UiDialogTitle>
                  <UiDialogDescription class="text-neutral-400">
                    Оставьте поле ключа пустым для автогенерации
                  </UiDialogDescription>
                </UiDialogHeader>

                <FormsLicenseKeyForm
                  :loading="isSubmitting"
                  @submit="handleCreateLicense"
                  @cancel="isDialogOpen = false"
                />
              </UiDialogContent>
            </UiDialog>
          </div>
        </UiCardHeader>

        <UiCardContent>
          <div v-if="!licenses || licenses.length === 0" class="py-12 text-center">
            <p class="mb-4 text-neutral-400">
              Лицензионные ключи отсутствуют
            </p>
            <UiButton
              class="bg-orange-600 hover:bg-orange-700"
              @click="isDialogOpen = true"
            >
              Добавить первый ключ
            </UiButton>
          </div>

          <div v-else class="overflow-x-auto">
            <UiTable>
              <UiTableHeader>
                <UiTableRow class="border-orange-900/20 hover:bg-orange-950/10">
                  <UiTableHead class="text-orange-400">
                    Ключ
                  </UiTableHead>
                  <UiTableHead class="text-orange-400">
                    Описание
                  </UiTableHead>
                  <UiTableHead class="text-orange-400">
                    Статус
                  </UiTableHead>
                  <UiTableHead class="text-orange-400">
                    Создан
                  </UiTableHead>
                  <UiTableHead class="text-orange-400">
                    Истекает
                  </UiTableHead>
                  <UiTableHead class="text-orange-400 text-right">
                    Действия
                  </UiTableHead>
                </UiTableRow>
              </UiTableHeader>

              <UiTableBody>
                <UiTableRow
                  v-for="license in licenses"
                  :key="license.id"
                  class="border-orange-900/20 hover:bg-orange-950/10"
                >
                  <UiTableCell class="font-mono text-neutral-100">
                    {{ license.key }}
                  </UiTableCell>
                  <UiTableCell class="text-neutral-300">
                    {{ license.description || '—' }}
                  </UiTableCell>
                  <UiTableCell>
                    <UiBadge
                      :variant="getEffectiveStatus(license) === 'active' ? 'default' : 'secondary'"
                      :class="{
                        'bg-green-900/40 text-green-400 border-green-800/30': getEffectiveStatus(license) === 'active',
                        'bg-red-900/40 text-red-400 border-red-800/30': getEffectiveStatus(license) === 'expired',
                        'bg-neutral-800 text-neutral-400 border-neutral-700': getEffectiveStatus(license) === 'inactive',
                      }"
                    >
                      {{ getEffectiveStatus(license) === 'active' ? 'Активен' : getEffectiveStatus(license) === 'expired' ? 'Истёк' : 'Неактивен' }}
                    </UiBadge>
                  </UiTableCell>
                  <UiTableCell class="text-neutral-400">
                    {{ formatDate(license.createdAt) }}
                  </UiTableCell>
                  <UiTableCell>
                    <span
                      v-if="license.expiresAt"
                      :class="isExpired(license.expiresAt) ? 'text-red-400' : 'text-neutral-400'"
                    >
                      {{ formatDate(license.expiresAt) }}
                      <span v-if="isExpired(license.expiresAt)" class="ml-1">
                        (истёк)
                      </span>
                    </span>
                    <span v-else class="text-neutral-500">
                      —
                    </span>
                  </UiTableCell>
                  <UiTableCell class="text-right">
                    <div class="flex justify-end gap-2">
                      <UiButton
                        v-if="getEffectiveStatus(license) === 'expired'"
                        variant="ghost"
                        size="sm"
                        class="text-orange-400 hover:bg-orange-950/20 hover:text-orange-300"
                        :disabled="extendingLicenseId === license.id"
                        @click="handleExtendLicense(license)"
                      >
                        {{ extendingLicenseId === license.id ? 'Продление...' : 'Продлить' }}
                      </UiButton>
                      <UiButton
                        variant="ghost"
                        size="sm"
                        class="text-red-400 hover:bg-red-950/20 hover:text-red-300"
                        @click="handleDeleteLicense(license.id)"
                      >
                        Удалить
                      </UiButton>
                    </div>
                  </UiTableCell>
                </UiTableRow>
              </UiTableBody>
            </UiTable>
          </div>
        </UiCardContent>
      </UiCard>
    </div>
  </div>
</template>
