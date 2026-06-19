<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { motion } from 'motion-v'
import { z } from 'zod'

const schema = z.object({
  login: z.string({ error: 'Required' }).min(1, 'Required').refine(
    (value) => {
      if (value.includes('@')) {
        return z.email().safeParse(value).success
      }

      return true
    },
    { message: 'Invalid email format' },
  ),
  password: z.string().min(1, 'Required'),
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  login: '',
  password: '',
})

const { fetch: fetchSession } = useUserSession()

const responseErrorMessage = ref<string>('')

async function onSubmit(event: FormSubmitEvent<Schema>) {
  responseErrorMessage.value = ''

  const res = await $fetch('/api/sign-in', {
    method: 'POST',
    body: event.data,
    onResponseError: (err) => {
      responseErrorMessage.value = err.response._data.message as string
    },
  })

  if (res.status) {
    await fetchSession()
    await navigateTo('/dashboard')
  }
}
</script>

<template>
  <div class="grid h-screen place-items-center">
    <motion.div
      :initial="{ opacity: 0, scale: 0.5 }"
      :animate="{ opacity: 1, scale: 1 }"
      :transition="{
        duration: 0.8,
        delay: 0.5,
        ease: [0, 0.71, 0.2, 1.01],
      }"
    >
      <UForm
        :schema="schema"
        :state="state"
        class="flex w-75 flex-col gap-4"
        @submit="onSubmit"
      >
        <UFormField label="Login" name="login">
          <UInput v-model="state.login" placeholder="Login.." class="w-full" />
        </UFormField>

        <UFormField label="Password" name="password">
          <UInput v-model="state.password" type="password" placeholder="********" class="w-full" />
        </UFormField>

        <p v-if="responseErrorMessage" class="text-sm text-error">
          {{ responseErrorMessage }}
        </p>

        <UButton type="submit" block>
          Login
        </UButton>
      </UForm>
    </motion.div>
  </div>
</template>
