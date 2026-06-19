<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

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

const modItems: { label: string, value: string }[] = [
  { label: 'Все моды', value: 'all' },
  ...MODS.map(m => ({ label: m, value: m as string })),
]

// Состояние сортировки таблиц (TanStack SortingState)
const licenseSorting = ref<{ id: string, desc: boolean }[]>([])
const serverSorting = ref<{ id: string, desc: boolean }[]>([])

// Иконка-индикатор сортировки для заголовка колонки.
function sortIcon(column: { getIsSorted: () => 'asc' | 'desc' | false }) {
  const dir = column.getIsSorted()
  if (dir === 'asc')
    return 'i-lucide-arrow-up'
  if (dir === 'desc')
    return 'i-lucide-arrow-down'
  return 'i-lucide-arrow-up-down'
}

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

// Подтверждение удаления через модалку Nuxt UI.
// licenseToDelete не обнуляем при закрытии, чтобы текст не пропадал во время анимации.
const licenseToDelete = ref<LicenseKey | null>(null)
const isDeleteDialogOpen = ref(false)
const isDeleting = ref(false)

function handleDeleteLicense(license: LicenseKey) {
  licenseToDelete.value = license
  isDeleteDialogOpen.value = true
}

async function confirmDeleteLicense() {
  if (!licenseToDelete.value)
    return

  isDeleting.value = true

  try {
    await $fetch(`/api/licenses/${licenseToDelete.value.id}`, {
      method: 'DELETE',
    })

    // Обновляем данные после удаления
    await refreshNuxtData('licenses')
    lastRefresh.value = new Date()

    isDeleteDialogOpen.value = false
  }
  catch (error) {
    console.error('Failed to delete license:', error)
    toast.add({ title: 'Не удалось удалить ключ', color: 'error' })
  }
  finally {
    isDeleting.value = false
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

function statusColor(status: 'active' | 'inactive' | 'expired') {
  if (status === 'active')
    return 'success'
  if (status === 'expired')
    return 'error'
  return 'neutral'
}

function statusLabel(status: 'active' | 'inactive' | 'expired') {
  if (status === 'active')
    return 'Активен'
  if (status === 'expired')
    return 'Истёк'
  return 'Неактивен'
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

// Копирование ключа в буфер обмена с временной индикацией.
const toast = useToast()
const copiedKey = ref<string | null>(null)

async function copyKey(key: string | null) {
  if (!key)
    return

  try {
    await navigator.clipboard.writeText(key)
    copiedKey.value = key
    toast.add({ title: 'Ключ скопирован', color: 'success', icon: 'i-lucide-check' })
    setTimeout(() => {
      if (copiedKey.value === key)
        copiedKey.value = null
    }, 2000)
  }
  catch (error) {
    console.error('Failed to copy key:', error)
    toast.add({ title: 'Не удалось скопировать', color: 'error' })
  }
}

const licenseColumns: TableColumn<LicenseKey>[] = [
  { accessorKey: 'key', header: 'Ключ' },
  { accessorKey: 'mod', header: 'Мод' },
  { accessorKey: 'description', header: 'Описание' },
  { id: 'status', header: 'Статус' },
  { accessorKey: 'policy', header: 'Политика' },
  { accessorKey: 'createdAt', header: 'Создан' },
  { accessorKey: 'expiresAt', header: 'Истекает' },
  { id: 'actions', header: '' },
]

const serverColumns: TableColumn<ServerInfo>[] = [
  { id: 'server', header: 'Сервер' },
  { accessorKey: 'mod', header: 'Мод' },
  { accessorKey: 'map', header: 'Карта' },
  { id: 'players', header: 'Игроки' },
  { accessorKey: 'version', header: 'Версия' },
  { accessorKey: 'key', header: 'Ключ' },
  { accessorKey: 'lastSeenAt', header: 'Активность' },
]
</script>

<template>
  <div class="min-h-screen">
    <UContainer class="py-8">
      <!-- Header -->
      <div class="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-highlighted">
            CS 1.6 License Manager
          </h1>
          <p class="mt-1 text-muted">
            Управление лицензионными ключами сервера Counter-Strike 1.6
          </p>
        </div>

        <UButton color="neutral" variant="outline" icon="i-lucide-log-out" @click="onLogout">
          Выход
        </UButton>
      </div>

      <!-- Licenses -->
      <UCard>
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-highlighted">
                Лицензионные ключи
              </h2>
              <p class="text-sm text-muted">
                Показано: {{ filteredLicenses.length }} из {{ licenses?.length ?? 0 }}
                <span class="ml-1 text-xs text-dimmed">
                  • Обновлено: {{ lastRefresh.toLocaleTimeString('ru-RU') }}
                </span>
              </p>
            </div>

            <div class="flex items-center gap-2">
              <USelect v-model="modFilter" :items="modItems" class="w-40" />

              <UModal
                v-model:open="isDialogOpen"
                title="Новый лицензионный ключ"
                description="Оставьте поле ключа пустым для автогенерации"
              >
                <UButton icon="i-lucide-plus">
                  Добавить ключ
                </UButton>

                <template #body>
                  <FormsLicenseKeyForm
                    :loading="isSubmitting"
                    @submit="handleCreateLicense"
                    @cancel="isDialogOpen = false"
                  />
                </template>
              </UModal>
            </div>
          </div>
        </template>

        <div v-if="filteredLicenses.length === 0" class="py-12 text-center">
          <p class="mb-4 text-muted">
            Лицензионные ключи отсутствуют
          </p>
          <UButton icon="i-lucide-plus" @click="isDialogOpen = true">
            Добавить первый ключ
          </UButton>
        </div>

        <UTable
          v-else
          v-model:sorting="licenseSorting"
          :data="filteredLicenses"
          :columns="licenseColumns"
        >
          <template #key-header="{ column }">
            <UButton
              variant="ghost"
              color="neutral"
              label="Ключ"
              class="-mx-2.5"
              :icon="sortIcon(column)"
              @click="column.toggleSorting(column.getIsSorted() === 'asc')"
            />
          </template>

          <template #mod-header="{ column }">
            <UButton
              variant="ghost"
              color="neutral"
              label="Мод"
              class="-mx-2.5"
              :icon="sortIcon(column)"
              @click="column.toggleSorting(column.getIsSorted() === 'asc')"
            />
          </template>

          <template #createdAt-header="{ column }">
            <UButton
              variant="ghost"
              color="neutral"
              label="Создан"
              class="-mx-2.5"
              :icon="sortIcon(column)"
              @click="column.toggleSorting(column.getIsSorted() === 'asc')"
            />
          </template>

          <template #expiresAt-header="{ column }">
            <UButton
              variant="ghost"
              color="neutral"
              label="Истекает"
              class="-mx-2.5"
              :icon="sortIcon(column)"
              @click="column.toggleSorting(column.getIsSorted() === 'asc')"
            />
          </template>

          <template #key-cell="{ row }">
            <div class="flex items-center gap-1.5">
              <span class="font-mono">{{ row.original.key }}</span>
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                :icon="copiedKey === row.original.key ? 'i-lucide-check' : 'i-lucide-copy'"
                :aria-label="`Скопировать ключ ${row.original.key}`"
                @click="copyKey(row.original.key)"
              />
            </div>
          </template>

          <template #mod-cell="{ row }">
            <UBadge color="neutral" variant="subtle">
              {{ row.original.mod }}
            </UBadge>
          </template>

          <template #description-cell="{ row }">
            {{ row.original.description || '—' }}
          </template>

          <template #status-cell="{ row }">
            <UBadge :color="statusColor(getEffectiveStatus(row.original))" variant="subtle">
              {{ statusLabel(getEffectiveStatus(row.original)) }}
            </UBadge>
          </template>

          <template #policy-cell="{ row }">
            <USelect
              :model-value="row.original.policy"
              :items="[...POLICIES]"
              size="sm"
              class="w-44"
              @update:model-value="v => handleChangePolicy(row.original, String(v))"
            />
          </template>

          <template #createdAt-cell="{ row }">
            <span class="text-muted">{{ formatDate(row.original.createdAt) }}</span>
          </template>

          <template #expiresAt-cell="{ row }">
            <span
              v-if="row.original.expiresAt"
              :class="isExpired(row.original.expiresAt) ? 'text-error' : 'text-muted'"
            >
              {{ formatDate(row.original.expiresAt) }}
              <span v-if="isExpired(row.original.expiresAt)">(истёк)</span>
            </span>
            <span v-else class="text-dimmed">—</span>
          </template>

          <template #actions-cell="{ row }">
            <div class="flex justify-end gap-1">
              <UButton
                v-if="getEffectiveStatus(row.original) === 'expired'"
                color="primary"
                variant="ghost"
                size="sm"
                :loading="extendingLicenseId === row.original.id"
                @click="handleExtendLicense(row.original)"
              >
                Продлить
              </UButton>
              <UButton
                color="error"
                variant="ghost"
                size="sm"
                icon="i-lucide-trash-2"
                @click="handleDeleteLicense(row.original)"
              />
            </div>
          </template>
        </UTable>
      </UCard>

      <!-- Servers (live telemetry from heartbeat) -->
      <UCard class="mt-8">
        <template #header>
          <div>
            <h2 class="text-lg font-semibold text-highlighted">
              Серверы
            </h2>
            <p class="text-sm text-muted">
              Онлайн-телеметрия (heartbeat). Всего: {{ servers?.length ?? 0 }}
            </p>
          </div>
        </template>

        <div v-if="!servers || servers.length === 0" class="py-12 text-center text-muted">
          Серверы ещё не присылали heartbeat
        </div>

        <UTable
          v-else
          v-model:sorting="serverSorting"
          :data="servers"
          :columns="serverColumns"
        >
          <template #mod-header="{ column }">
            <UButton
              variant="ghost"
              color="neutral"
              label="Мод"
              class="-mx-2.5"
              :icon="sortIcon(column)"
              @click="column.toggleSorting(column.getIsSorted() === 'asc')"
            />
          </template>

          <template #key-header="{ column }">
            <UButton
              variant="ghost"
              color="neutral"
              label="Ключ"
              class="-mx-2.5"
              :icon="sortIcon(column)"
              @click="column.toggleSorting(column.getIsSorted() === 'asc')"
            />
          </template>

          <template #lastSeenAt-header="{ column }">
            <UButton
              variant="ghost"
              color="neutral"
              label="Активность"
              class="-mx-2.5"
              :icon="sortIcon(column)"
              @click="column.toggleSorting(column.getIsSorted() === 'asc')"
            />
          </template>

          <template #server-cell="{ row }">
            <div class="flex items-center gap-2">
              <span
                class="inline-block size-2 rounded-full"
                :class="isServerOnline(row.original.lastSeenAt) ? 'bg-green-500' : 'bg-neutral-500'"
              />
              <div class="flex flex-col">
                <span class="text-highlighted">{{ row.original.hostname || '—' }}</span>
                <span class="font-mono text-xs text-dimmed">{{ row.original.ip || '—' }}</span>
              </div>
            </div>
          </template>

          <template #mod-cell="{ row }">
            <UBadge color="neutral" variant="subtle">
              {{ row.original.mod || '—' }}
            </UBadge>
          </template>

          <template #map-cell="{ row }">
            {{ row.original.map || '—' }}
          </template>

          <template #players-cell="{ row }">
            {{ row.original.players }} / {{ row.original.maxplayers }}
          </template>

          <template #version-cell="{ row }">
            <span class="text-muted">{{ row.original.version || '—' }}</span>
          </template>

          <template #key-cell="{ row }">
            <div class="flex items-center gap-1.5">
              <span class="font-mono">{{ row.original.key || '—' }}</span>
              <UButton
                v-if="row.original.key"
                color="neutral"
                variant="ghost"
                size="xs"
                :icon="copiedKey === row.original.key ? 'i-lucide-check' : 'i-lucide-copy'"
                :aria-label="`Скопировать ключ ${row.original.key}`"
                @click="copyKey(row.original.key)"
              />
              <span class="text-xs text-dimmed">({{ policyLabel(row.original.policy) }})</span>
            </div>
          </template>

          <template #lastSeenAt-cell="{ row }">
            <span class="text-muted">{{ formatDate(row.original.lastSeenAt) }}</span>
          </template>
        </UTable>
      </UCard>

      <!-- Подтверждение удаления лицензии -->
      <UModal
        v-model:open="isDeleteDialogOpen"
        title="Удалить лицензионный ключ?"
        :description="licenseToDelete
          ? `Ключ «${licenseToDelete.key}» будет удалён без возможности восстановления.`
          : ''"
      >
        <template #footer>
          <div class="flex w-full justify-end gap-2">
            <UButton
              color="neutral"
              variant="outline"
              :disabled="isDeleting"
              @click="isDeleteDialogOpen = false"
            >
              Отмена
            </UButton>
            <UButton
              color="error"
              icon="i-lucide-trash-2"
              :loading="isDeleting"
              @click="confirmDeleteLicense"
            >
              Удалить
            </UButton>
          </div>
        </template>
      </UModal>
    </UContainer>
  </div>
</template>
