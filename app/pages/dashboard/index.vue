<script setup lang="ts">
interface LicenseKey {
  id: number
  key: string
  mod: string
  description: string | null
  status: 'active' | 'inactive'
  policy: 'key' | 'time' | 'open'
  expiresAt: Date | string | null
  createdAt: Date | string
  updatedAt: Date | string
}

interface ServerInfo {
  id: number
  ip: string | null
  hostname: string | null
  map: string | null
  players: number
  maxplayers: number
  version: string | null
  lastSeenAt: Date | string
  key: string | null
  mod: string | null
  status: 'active' | 'inactive' | null
  policy: 'key' | 'time' | 'open' | null
  expiresAt: Date | string | null
}

interface LicenseFormData {
  key?: string
  mod: string
  description?: string
  status: 'active' | 'inactive'
  policy: 'key' | 'time' | 'open'
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

// Live-телеметрия серверов (heartbeat)
const { data: servers } = await useFetch<ServerInfo[]>('/api/servers', {
  key: 'servers',
})

// Фильтр по моду (сайт обслуживает несколько модов)
const modFilter = ref<string>('all')

const filteredLicenses = computed(() => {
  if (!licenses.value)
    return []
  if (modFilter.value === 'all')
    return licenses.value
  return licenses.value.filter(l => l.mod === modFilter.value)
})

// Автоматическое обновление данных каждую минуту
// для синхронизации с cron-задачей обновления истёкших лицензий
const lastRefresh = ref<Date>(new Date())

onMounted(() => {
  const refreshInterval = setInterval(async () => {
    await Promise.all([refreshNuxtData('licenses'), refreshNuxtData('servers')])
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

// Смена политики прямо из таблицы (key / time / open) — применяется на сервере на ближайшем heartbeat.
async function handleChangePolicy(license: LicenseKey, policy: string) {
  try {
    await $fetch(`/api/licenses/${license.id}`, {
      method: 'PATCH',
      body: { policy },
    })
    await refreshNuxtData('licenses')
    lastRefresh.value = new Date()
  }
  catch (error) {
    console.error('Failed to change policy:', error)
  }
}

function policyLabel(policy: string | null) {
  return POLICIES.find(p => p.value === policy)?.label ?? policy ?? '—'
}

// Сервер считается онлайн, если heartbeat был меньше 10 минут назад.
function isServerOnline(lastSeenAt: Date | string) {
  return (Date.now() - new Date(lastSeenAt).getTime()) < 10 * 60 * 1000
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
                Показано ключей: {{ filteredLicenses.length }} из {{ licenses?.length ?? 0 }}
                <span class="ml-2 text-xs text-neutral-500">
                  • Обновлено: {{ lastRefresh.toLocaleTimeString('ru-RU') }}
                </span>
              </UiCardDescription>
            </div>

            <div class="flex items-center gap-2">
              <UiNativeSelect
                v-model="modFilter"
                class="border-orange-900/30 bg-neutral-800 text-neutral-100"
              >
                <UiNativeSelectOption value="all">
                  Все моды
                </UiNativeSelectOption>
                <UiNativeSelectOption v-for="m in MODS" :key="m" :value="m">
                  {{ m }}
                </UiNativeSelectOption>
              </UiNativeSelect>

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
          </div>
        </UiCardHeader>

        <UiCardContent>
          <div v-if="filteredLicenses.length === 0" class="py-12 text-center">
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
                    Мод
                  </UiTableHead>
                  <UiTableHead class="text-orange-400">
                    Описание
                  </UiTableHead>
                  <UiTableHead class="text-orange-400">
                    Статус
                  </UiTableHead>
                  <UiTableHead class="text-orange-400">
                    Политика
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
                  v-for="license in filteredLicenses"
                  :key="license.id"
                  class="border-orange-900/20 hover:bg-orange-950/10"
                >
                  <UiTableCell class="font-mono text-neutral-100">
                    {{ license.key }}
                  </UiTableCell>
                  <UiTableCell>
                    <UiBadge class="border-orange-800/30 bg-orange-950/30 text-orange-300">
                      {{ license.mod }}
                    </UiBadge>
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
                  <UiTableCell>
                    <UiNativeSelect
                      :model-value="license.policy"
                      class="border-orange-900/30 bg-neutral-800 text-neutral-100"
                      @update:model-value="v => handleChangePolicy(license, String(v))"
                    >
                      <UiNativeSelectOption v-for="p in POLICIES" :key="p.value" :value="p.value">
                        {{ p.label }}
                      </UiNativeSelectOption>
                    </UiNativeSelect>
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

      <!-- Servers (live telemetry from heartbeat) -->
      <UiCard class="mt-8 border-orange-900/20 bg-neutral-900/50 backdrop-blur">
        <UiCardHeader>
          <UiCardTitle class="text-2xl text-orange-400">
            Серверы
          </UiCardTitle>
          <UiCardDescription class="text-neutral-400">
            Онлайн-телеметрия (heartbeat). Всего: {{ servers?.length ?? 0 }}
          </UiCardDescription>
        </UiCardHeader>

        <UiCardContent>
          <div v-if="!servers || servers.length === 0" class="py-12 text-center text-neutral-400">
            Серверы ещё не присылали heartbeat
          </div>

          <div v-else class="overflow-x-auto">
            <UiTable>
              <UiTableHeader>
                <UiTableRow class="border-orange-900/20 hover:bg-orange-950/10">
                  <UiTableHead class="text-orange-400">
                    Сервер
                  </UiTableHead>
                  <UiTableHead class="text-orange-400">
                    Мод
                  </UiTableHead>
                  <UiTableHead class="text-orange-400">
                    Карта
                  </UiTableHead>
                  <UiTableHead class="text-orange-400">
                    Игроки
                  </UiTableHead>
                  <UiTableHead class="text-orange-400">
                    Версия
                  </UiTableHead>
                  <UiTableHead class="text-orange-400">
                    Ключ
                  </UiTableHead>
                  <UiTableHead class="text-orange-400">
                    Активность
                  </UiTableHead>
                </UiTableRow>
              </UiTableHeader>

              <UiTableBody>
                <UiTableRow
                  v-for="server in servers"
                  :key="server.id"
                  class="border-orange-900/20 hover:bg-orange-950/10"
                >
                  <UiTableCell class="text-neutral-100">
                    <div class="flex items-center gap-2">
                      <span
                        class="inline-block size-2 rounded-full"
                        :class="isServerOnline(server.lastSeenAt) ? 'bg-green-500' : 'bg-neutral-600'"
                      />
                      <div class="flex flex-col">
                        <span>{{ server.hostname || '—' }}</span>
                        <span class="font-mono text-xs text-neutral-500">{{ server.ip || '—' }}</span>
                      </div>
                    </div>
                  </UiTableCell>
                  <UiTableCell>
                    <UiBadge class="border-orange-800/30 bg-orange-950/30 text-orange-300">
                      {{ server.mod || '—' }}
                    </UiBadge>
                  </UiTableCell>
                  <UiTableCell class="text-neutral-300">
                    {{ server.map || '—' }}
                  </UiTableCell>
                  <UiTableCell class="text-neutral-300">
                    {{ server.players }} / {{ server.maxplayers }}
                  </UiTableCell>
                  <UiTableCell class="text-neutral-400">
                    {{ server.version || '—' }}
                  </UiTableCell>
                  <UiTableCell class="font-mono text-neutral-300">
                    {{ server.key || '—' }}
                    <span class="ml-1 text-xs text-neutral-500">({{ policyLabel(server.policy) }})</span>
                  </UiTableCell>
                  <UiTableCell class="text-neutral-400">
                    {{ formatDate(server.lastSeenAt) }}
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
