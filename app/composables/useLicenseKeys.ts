interface LicenseKey {
  id: number
  key: string
  description: string | null
  status: 'active' | 'inactive'
  expiresAt: Date | null
  createdAt: Date
  updatedAt: Date
}

interface CreateLicenseInput {
  key?: string
  description?: string
  status?: 'active' | 'inactive'
  expiresAt?: string
}

export function useLicenseKeys() {
  const licenses = useState<LicenseKey[]>('licenses', () => [])
  const loading = useState<boolean>('licenses-loading', () => false)
  const error = useState<string | null>('licenses-error', () => null)

  async function fetchLicenses() {
    loading.value = true
    error.value = null

    try {
      const data = await $fetch<LicenseKey[]>('/api/licenses')
      licenses.value = data
    }
    catch (e: any) {
      error.value = e.message || 'Failed to fetch licenses'
      console.error('Failed to fetch licenses:', e)
    }
    finally {
      loading.value = false
    }
  }

  async function createLicense(input: CreateLicenseInput) {
    loading.value = true
    error.value = null

    try {
      const newLicense = await $fetch<LicenseKey>('/api/licenses', {
        method: 'POST',
        body: input,
      })

      licenses.value = [newLicense, ...licenses.value]
      return newLicense
    }
    catch (e: any) {
      error.value = e.message || 'Failed to create license'
      console.error('Failed to create license:', e)
      throw e
    }
    finally {
      loading.value = false
    }
  }

  async function deleteLicense(id: number) {
    loading.value = true
    error.value = null

    try {
      await $fetch(`/api/licenses/${id}`, {
        method: 'DELETE',
      })

      licenses.value = licenses.value.filter(l => l.id !== id)
    }
    catch (e: any) {
      error.value = e.message || 'Failed to delete license'
      console.error('Failed to delete license:', e)
      throw e
    }
    finally {
      loading.value = false
    }
  }

  return {
    licenses,
    loading,
    error,
    fetchLicenses,
    createLicense,
    deleteLicense,
  }
}
