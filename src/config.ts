export interface SanitizerConfig {
  readonly sensitivePatterns: readonly string[]
  readonly safeKeys: readonly string[]
}

const STORAGE_KEY = 'compose-sanitizer-config'

export const DEFAULT_CONFIG: SanitizerConfig = {
  sensitivePatterns: [
    'passw(or)?d',
    '^pw$',
    '[_.]pass(w)?$',
    '^pass[_.]?',
    'secret',
    'token',
    'api[_\\-.:]?key',
    'auth',
    'credential',
    'private[_\\-.]?key',
    'vpn[_\\-.]?user',
  ],
  safeKeys: [
    'PUID', 'PGID', 'TZ', 'UMASK', 'UMASK_SET',
    'HOME', 'PATH', 'LANG', 'LC_ALL',
    'LOG_LEVEL', 'WEBUI_PORT',
  ],
}

function isValidConfig(value: unknown): value is Partial<SanitizerConfig> {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  if (obj['sensitivePatterns'] !== undefined && !Array.isArray(obj['sensitivePatterns'])) return false
  if (obj['safeKeys'] !== undefined && !Array.isArray(obj['safeKeys'])) return false
  return true
}

export function loadConfig(): SanitizerConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return DEFAULT_CONFIG

    const parsed: unknown = JSON.parse(raw)
    if (!isValidConfig(parsed)) return DEFAULT_CONFIG

    return {
      sensitivePatterns: parsed.sensitivePatterns ?? DEFAULT_CONFIG.sensitivePatterns,
      safeKeys: parsed.safeKeys ?? DEFAULT_CONFIG.safeKeys,
    }
  } catch {
    return DEFAULT_CONFIG
  }
}

export function saveConfig(config: SanitizerConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export function resetConfig(): SanitizerConfig {
  localStorage.removeItem(STORAGE_KEY)
  return DEFAULT_CONFIG
}
