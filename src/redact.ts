import { load, dump } from 'js-yaml'
import { isSensitiveKey, containsEmail, anonymizeHomePath } from './patterns'

const REDACTED = '**REDACTED**'

export interface RedactStats {
  readonly redactedEnvVars: number
  readonly redactedEmails: number
  readonly anonymizedPaths: number
}

export interface RedactResult {
  readonly output: string
  readonly error: string | null
  readonly stats: RedactStats
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function redactEnvDict(
  env: Record<string, unknown>,
  stats: { redactedEnvVars: number; redactedEmails: number },
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(env)) {
    const strValue = value == null ? '' : String(value)
    if (isSensitiveKey(key)) {
      result[key] = strValue === '' ? '' : REDACTED
      if (strValue !== '') stats.redactedEnvVars++
    } else if (containsEmail(strValue)) {
      result[key] = REDACTED
      stats.redactedEmails++
    } else {
      result[key] = value
    }
  }
  return result
}

function redactEnvArray(
  env: readonly unknown[],
  stats: { redactedEnvVars: number; redactedEmails: number },
): readonly string[] {
  return env.map(item => {
    const str = String(item)
    const eqIdx = str.indexOf('=')
    if (eqIdx === -1) return str

    const key = str.slice(0, eqIdx)
    const value = str.slice(eqIdx + 1)

    if (isSensitiveKey(key)) {
      stats.redactedEnvVars++
      return `${key}=${REDACTED}`
    }
    if (containsEmail(value)) {
      stats.redactedEmails++
      return `${key}=${REDACTED}`
    }
    return str
  })
}

function anonymizeVolumes(
  volumes: readonly unknown[],
  stats: { anonymizedPaths: number },
): readonly unknown[] {
  return volumes.map(vol => {
    if (typeof vol === 'string') {
      const anonymized = anonymizeHomePath(vol)
      if (anonymized !== vol) stats.anonymizedPaths++
      return anonymized
    }
    if (isRecord(vol) && typeof vol['source'] === 'string') {
      const anonymized = anonymizeHomePath(vol['source'])
      if (anonymized !== vol['source']) {
        stats.anonymizedPaths++
        return { ...vol, source: anonymized }
      }
    }
    return vol
  })
}

function redactService(
  service: Record<string, unknown>,
  stats: { redactedEnvVars: number; redactedEmails: number; anonymizedPaths: number },
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...service }

  const env = service['environment']
  if (Array.isArray(env)) {
    result['environment'] = redactEnvArray(env, stats)
  } else if (isRecord(env)) {
    result['environment'] = redactEnvDict(env, stats)
  }

  const volumes = service['volumes']
  if (Array.isArray(volumes)) {
    result['volumes'] = anonymizeVolumes(volumes, stats)
  }

  return result
}

export function redactCompose(raw: string): RedactResult {
  const emptyStats: RedactStats = { redactedEnvVars: 0, redactedEmails: 0, anonymizedPaths: 0 }

  let parsed: unknown
  try {
    parsed = load(raw)
  } catch (e) {
    return {
      output: '',
      error: `Invalid YAML: ${e instanceof Error ? e.message : String(e)}`,
      stats: emptyStats,
    }
  }

  if (!isRecord(parsed)) {
    return {
      output: '',
      error: 'Input is not a valid Docker Compose file (expected a YAML mapping at root level)',
      stats: emptyStats,
    }
  }

  const stats = { redactedEnvVars: 0, redactedEmails: 0, anonymizedPaths: 0 }
  const compose: Record<string, unknown> = { ...parsed }

  const services = parsed['services']
  if (isRecord(services)) {
    const newServices: Record<string, unknown> = {}
    for (const [name, svc] of Object.entries(services)) {
      newServices[name] = isRecord(svc) ? redactService(svc, stats) : svc
    }
    compose['services'] = newServices
  }

  return {
    output: dump(compose, { lineWidth: -1, noRefs: true, quotingType: "'", forceQuotes: false }),
    error: null,
    stats: { ...stats },
  }
}
