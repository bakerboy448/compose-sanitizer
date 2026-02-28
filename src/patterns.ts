export const DEFAULT_SENSITIVE_PATTERNS: readonly RegExp[] = [
  /passw(or)?d/i,
  /^pw$/i,
  /[_.]pass(w)?$/i,
  /^pass[_.]?/i,
  /secret/i,
  /token/i,
  /api[_\-.:]?key/i,
  /auth/i,
  /credential/i,
  /private[_\-.]?key/i,
  /vpn[_\-.]?user/i,
]

export const DEFAULT_SAFE_KEYS: ReadonlySet<string> = new Set([
  'PUID', 'PGID', 'TZ', 'UMASK', 'UMASK_SET',
  'HOME', 'PATH', 'LANG', 'LC_ALL',
  'LOG_LEVEL', 'WEBUI_PORT',
])

export const EMAIL_PATTERN = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/

export const HOME_DIR_PATTERN = /^(\/home\/[^/]+|~|\/root)\//

export function isSensitiveKey(
  key: string,
  sensitivePatterns?: readonly RegExp[],
  safeKeys?: ReadonlySet<string>,
): boolean {
  const safe = safeKeys ?? DEFAULT_SAFE_KEYS
  const sensitive = sensitivePatterns ?? DEFAULT_SENSITIVE_PATTERNS
  if (safe.has(key.toUpperCase())) return false
  return sensitive.some(p => p.test(key))
}

export function containsEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value)
}

export function anonymizeHomePath(volumeStr: string): string {
  return volumeStr.replace(HOME_DIR_PATTERN, '~/')
}
