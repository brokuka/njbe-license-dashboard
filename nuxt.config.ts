import tailwindcss from '@tailwindcss/vite'
import './config/env'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  css: ['~/assets/main.css'],

  vite: {
    plugins: [
      tailwindcss(),
    ],
  },

  modules: [
    '@nuxt/eslint',
    'shadcn-nuxt',
    '@vueuse/nuxt',
    'nuxt-auth-utils',
    '@vee-validate/nuxt',
  ],

  nitro: {
    experimental: {
      tasks: true,
    },
    scheduledTasks: {
      // Проверяем истёкшие лицензии каждые 5 минут
      '* * * * *': ['update-expired-licenses'],
    },
  },

  veeValidate: {
    autoImports: true,
    typedSchemaPackage: 'zod',
    componentNames: {
      Form: 'VeeForm',
      Field: 'VeeField',
      FieldArray: 'VeeFieldArray',
      ErrorMessage: 'VeeErrorMessage',
    },
  },
})
