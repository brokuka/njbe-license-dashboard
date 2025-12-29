<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import { CalendarDateTime } from '@internationalized/date'

interface LicenseFormData {
  key?: string
  description?: string
  status: 'active' | 'inactive'
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

const formData = ref<{
  key: string
  description: string
  status: string
  expiresAt?: DateValue
  time: string
}>({
  key: '',
  description: '',
  status: 'active',
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

    // Создаём Date объект с учётом Georgia timezone (GMT+4)
    // Пользователь вводит локальное время, которое нужно сохранить как UTC
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
    description: formData.value.description || undefined,
    status: formData.value.status as 'active' | 'inactive',
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
    description: '',
    status: 'active',
    expiresAt: undefined,
    time: '00:00:00',
  }
}
</script>

<template>
  <div class="space-y-4 py-4">
    <div class="space-y-2">
      <UiLabel for="key" class="text-neutral-300">
        Ключ (опционально)
      </UiLabel>

      <UiInput
        id="key"
        v-model="formData.key"
        placeholder="XXXX-XXXX-XXXX-XXXX"
        class="border-orange-900/30 bg-neutral-800 text-neutral-100 placeholder:text-neutral-500"
      />
    </div>

    <div class="space-y-2">
      <UiLabel for="description" class="text-neutral-300">
        Описание
      </UiLabel>

      <UiInput
        id="description"
        v-model="formData.description"
        placeholder="Описание ключа..."
        class="border-orange-900/30 bg-neutral-800 text-neutral-100 placeholder:text-neutral-500"
      />
    </div>

    <div class="flex gap-2">
      <div class="flex flex-col gap-3 flex-1">
        <UiLabel for="expiresAt" class="text-neutral-300">
          Date
        </UiLabel>

        <UiDatePicker id="expiresAt" v-model="formData.expiresAt" />
      </div>

      <div class="flex flex-col gap-3">
        <UiLabel for="time-picker" class="px-1 text-neutral-300">
          Time
        </UiLabel>

        <UiInput
          id="time-picker"
          v-model="formData.time"
          type="time"
          step="1"
          class="border-orange-900/30 bg-neutral-800 text-neutral-100 placeholder:text-neutral-500 appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
      </div>
    </div>

    <div class="space-y-2">
      <UiLabel class="text-neutral-300">
        Статус
      </UiLabel>

      <div class="flex gap-4">
        <UiRadioGroup v-model="formData.status" default-value="active">
          <div class="flex items-center space-x-2">
            <UiRadioGroupItem id="r1" value="active" />
            <UiLabel class="text-neutral-300" for="r1">
              Активен
            </UiLabel>
          </div>

          <div class="flex items-center space-x-2">
            <UiRadioGroupItem id="r2" value="inactive" />

            <UiLabel class="text-neutral-300" for="r2">
              Неактивен
            </UiLabel>
          </div>
        </UiRadioGroup>
      </div>
    </div>

    <div class="flex justify-end gap-2 pt-4">
      <UiButton
        type="button"
        variant="secondary"
        @click="handleCancel"
      >
        Отмена
      </UiButton>

      <UiButton
        type="submit"
        class="bg-orange-600 hover:bg-orange-700"
        :disabled="loading"
        @click="handleSubmit"
      >
        <UiSpinner v-if="loading" class="animate-spin" />
        Создать
      </UiButton>
    </div>
  </div>
</template>
