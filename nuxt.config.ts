export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  css: ['~/assets/main.css'],

  // Сервер-сайд переменные. Переопределяются env-переменными с префиксом NUXT_:
  // databaseUrl  ← NUXT_DATABASE_URL
  // adminUsername ← NUXT_ADMIN_USERNAME, и т.д.
  // NUXT_SESSION_PASSWORD обрабатывает сам nuxt-auth-utils (runtimeConfig.session).
  runtimeConfig: {
    databaseUrl: '',
    adminUsername: '',
    adminPassword: '',
    adminEmail: '',
  },

  vite: {
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
        'motion-v',
        'zod',
      ]
    }
  },

  modules: [
    '@nuxt/ui',
    '@nuxt/eslint',
    '@vueuse/nuxt',
    'nuxt-auth-utils',
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
})
