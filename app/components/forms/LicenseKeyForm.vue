<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import { CalendarDateTime, DateFormatter, getLocalTimeZone } from '@internationalized/date'

interface LicenseFormData {
  key?: string
  mod: string
  description?: string
  status: 'active' | 'inactive'
  policy: 'key' | 'time' | 'open'
  expiresAt?: string
}

interface Props {
  loading?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  submit: [data: LicenseFormData]
  cancel: []
}>()

const df = new DateFormatter('ru-RU', { dateStyle: 'long' })

const statusItems = [
  { label: 'Активен', value: 'active' },
  { label: 'Неактивен', value: 'inactive' },
]

// Widen to plain strings — formData хранит значения как string.
const modOptions: string[] = [...MODS]
const policyOptions = POLICIES.map(p => ({ label: p.label, value: p.value as string }))

const formData = ref<{
  key: string
  mod: string
  description: string
  status: string
  policy: string
  expiresAt?: DateValue
  time: string
}>({
  key: '',
  mod: MODS[0],
  description: '',
  status: 'active',
  policy: 'key',
  expiresAt: undefined,
  time: '00:00:00',
})

function handleSubmit() {
  // Конвертируем DateValue и время в ISO string для API
  let expiresAtISO: string | undefined

  if (formData.value.expiresAt) {
    const timeParts = formData.value.time.split(':').map(Number)
    const hours = timeParts[0] ?? 0
    const minutes = timeParts[1] ?? 0
    const seconds = timeParts[2] ?? 0

    // Преобразуем CalendarDate в CalendarDateTime, чтобы можно было установить время
    let dateWithTime = formData.value.expiresAt

    // Проверяем, есть ли уже поле hour (это CalendarDateTime или ZonedDateTime)
    if (!('hour' in dateWithTime)) {
      // Это CalendarDate - создаём новый CalendarDateTime с временем
      dateWithTime = new CalendarDateTime(
        dateWithTime.year,
        dateWithTime.month,
        dateWithTime.day,
        hours,
        minutes,
        seconds,
      )
    }
    else {
      // Это уже CalendarDateTime или ZonedDateTime - используем set()
      dateWithTime = dateWithTime.set({ hour: hours, minute: minutes, second: seconds })
    }

    // Создаём Date объект с учётом локального времени пользователя
    const localDate = new Date(
      dateWithTime.year,
      dateWithTime.month - 1, // JavaScript месяцы 0-indexed
      dateWithTime.day,
      dateWithTime.hour,
      dateWithTime.minute,
      dateWithTime.second,
    )

    // toISOString() автоматически конвертирует локальное время в UTC
    expiresAtISO = localDate.toISOString()
  }

  const submitData = {
    key: formData.value.key || undefined,
    mod: formData.value.mod,
    description: formData.value.description || undefined,
    status: formData.value.status as 'active' | 'inactive',
    policy: formData.value.policy as 'key' | 'time' | 'open',
    expiresAt: expiresAtISO,
  }

  emit('submit', submitData)

  // Сброс формы после отправки
  resetForm()
}

function handleCancel() {
  resetForm()
  emit('cancel')
}

function resetForm() {
  formData.value = {
    key: '',
    mod: MODS[0],
    description: '',
    status: 'active',
    policy: 'key',
    expiresAt: undefined,
    time: '00:00:00',
  }
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="handleSubmit">
    <UFormField label="Ключ (опционально)" name="key">
      <UInput
        v-model="formData.key"
        placeholder="XXXX-XXXX-XXXX-XXXX"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Мод" name="mod">
      <USelect v-model="formData.mod" :items="modOptions" class="w-full" />
    </UFormField>

    <UFormField label="Политика" name="policy">
      <USelect v-model="formData.policy" :items="policyOptions" class="w-full" />
    </UFormField>

    <UFormField label="Описание" name="description">
      <UInput
        v-model="formData.description"
        placeholder="Описание ключа..."
        class="w-full"
      />
    </UFormField>

    <div class="flex gap-2">
      <UFormField label="Дата" name="expiresAt" class="flex-1">
        <UPopover>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-calendar"
            class="w-full justify-start font-normal"
          >
            {{ formData.expiresAt ? df.format(formData.expiresAt.toDate(getLocalTimeZone())) : 'Выберите дату' }}
          </UButton>

          <template #content>
            <!-- @vue-expect-error UCalendar/@internationalized/date type identity quirk (runtime OK) -->
            <UCalendar
              v-model="formData.expiresAt"
              :range="false"
              :multiple="false"
              class="p-2"
            />
          </template>
        </UPopover>
      </UFormField>

      <UFormField label="Время" name="time">
        <UInput
          v-model="formData.time"
          type="time"
          :step="1"
        />
      </UFormField>
    </div>

    <UFormField label="Статус" name="status">
      <URadioGroup
        v-model="formData.status"
        :items="statusItems"
        orientation="horizontal"
      />
    </UFormField>

    <div class="flex justify-end gap-2 pt-2">
      <UButton
        type="button"
        color="neutral"
        variant="ghost"
        @click="handleCancel"
      >
        Отмена
      </UButton>

      <UButton
        type="submit"
        :loading="loading"
      >
        Создать
      </UButton>
    </div>
  </form>
</template>
