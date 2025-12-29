<script setup lang="ts">
import { motion } from 'motion-v'
import { z } from 'zod'

const formSchema = z.object({
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

const { handleSubmit } = useForm({
  validationSchema: toTypedSchema(formSchema),
})

const { fetch } = useUserSession()

const responseErrorMessage = ref<string>('')

const onSubmit = handleSubmit(async (data) => {
  const res = await $fetch('/api/sign-in', {
    method: 'POST',
    body: data,
    onResponseError: (err) => {
      responseErrorMessage.value = err.response._data.message as string
    },
  })

  if (res.status) {
    fetch().then(async () => await navigateTo('/dashboard'))
  }
})

const formElements = [
  {
    name: 'login',
    label: 'Login',
    type: 'text',
    placeholder: 'Login..',
  },
  {
    name: 'password',
    label: 'Password',
    type: 'password',
    placeholder: '********',
  },
]
</script>

<template>
  <div class="grid place-items-center h-screen">
    <motion.form
      class="w-75 flex flex-col gap-4"
      :initial="{ opacity: 0, scale: 0.5 }"
      :animate="{ opacity: 1, scale: 1 }" :transition="{
        duration: 0.8,
        delay: 0.5,
        ease: [0, 0.71, 0.2, 1.01],
      }"
      @submit="onSubmit"
    >
      <VeeField v-for="element in formElements" :key="element.name" v-slot="{ field, errors }" :name="element.name">
        <UiField :data-invalid="!!errors.length">
          <UiFieldLabel :for="element.name">
            {{ element.label }}
          </UiFieldLabel>

          <UiInput
            :id="element.name" :type="element.type" :placeholder="element.placeholder" v-bind="field"
            :aria-invalid="!!errors.length"
          />

          <UiFieldError v-if="errors.length" :errors="errors" />
        </UiField>
      </VeeField>

      <span v-if="responseErrorMessage" class="text-destructive">
        {{ responseErrorMessage }}
      </span>

      <UiButton type="submit">
        Login
      </UiButton>
    </motion.form>
  </div>
</template>
