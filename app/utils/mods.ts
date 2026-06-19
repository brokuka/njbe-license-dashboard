// Mods served by this dashboard. Add new mod ids here as they adopt the heartbeat.
// Stored as plain text on license_key.mod, so extending this list needs no DB migration.
export const MODS = ['nhnse', 'njbe', 'surf', 'knife'] as const

export type Mod = (typeof MODS)[number]

// Licensing policy options shown in the UI.
export const POLICIES = [
  { value: 'key', label: 'По ключу' },
  { value: 'time', label: 'По времени' },
  { value: 'open', label: 'Открыто (без лицензии)' },
] as const

export type Policy = (typeof POLICIES)[number]['value']
