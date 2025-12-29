<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import type { HTMLAttributes } from 'vue'

import { DateFormatter, getLocalTimeZone, today } from '@internationalized/date'
import { CalendarIcon } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '~/utils/lib'

defineProps<{
  id: HTMLAttributes['id']
}>()

const defaultPlaceholder = today(getLocalTimeZone())
const date = defineModel() as Ref<DateValue>

const df = new DateFormatter('ru-RU', {
  dateStyle: 'long',
})
</script>

<template>
  <Popover v-slot="{ close }">
    <PopoverTrigger as-child>
      <Button
        :id variant="outline"
        :class="cn('w-full justify-start text-left font-normal border-orange-900/30 bg-neutral-800 text-neutral-100 hover:bg-neutral-800/80 hover:text-neutral-100', {
          'text-neutral-500': !date,
        })"
      >
        <CalendarIcon class="mr-2 h-4 w-4" />
        {{ date ? df.format(date.toDate(getLocalTimeZone())) : "Выберите дату" }}
      </Button>
    </PopoverTrigger>

    <PopoverContent class="w-auto p-0" align="start">
      <Calendar
        v-model="date" :default-placeholder="defaultPlaceholder" layout="month-and-year" initial-focus
        @update:model-value="close"
      />
    </PopoverContent>
  </Popover>
</template>
