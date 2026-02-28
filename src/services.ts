import { isRecord } from './patterns'

export interface NetworkInfo {
  readonly name: string
  readonly aliases: readonly string[]
  readonly ipv4Address: string
}

export interface ServiceInfo {
  readonly name: string
  readonly image: string
  readonly ports: readonly string[]
  readonly volumes: readonly string[]
  readonly networks: readonly NetworkInfo[]
  readonly environment: ReadonlyMap<string, string>
  readonly extras: ReadonlyMap<string, string>
}

function normalizePort(entry: unknown): string {
  if (typeof entry === 'string' || typeof entry === 'number') {
    return String(entry)
  }
  if (isRecord(entry)) {
    const target = entry['target'] ?? ''
    const published = entry['published'] ?? ''
    const protocol = typeof entry['protocol'] === 'string' ? entry['protocol'] : undefined
    const hostIp = typeof entry['host_ip'] === 'string' ? entry['host_ip'] : undefined
    const hostPart = hostIp ? `${hostIp}:${published}` : String(published)
    const base = `${hostPart}:${target}`
    return protocol ? `${base}/${protocol}` : base
  }
  return String(entry)
}

function normalizePorts(ports: unknown): readonly string[] {
  if (!Array.isArray(ports)) return []
  return ports.map(normalizePort)
}

function normalizeVolume(entry: unknown): string {
  if (typeof entry === 'string') return entry
  if (isRecord(entry)) {
    const source = entry['source'] ?? ''
    const target = entry['target'] ?? ''
    const readOnly = entry['read_only'] === true
    const base = `${source}:${target}`
    return readOnly ? `${base}:ro` : base
  }
  return String(entry)
}

function normalizeVolumes(volumes: unknown): readonly string[] {
  if (!Array.isArray(volumes)) return []
  return volumes.map(normalizeVolume)
}

function extractNetworks(networks: unknown): readonly NetworkInfo[] {
  if (Array.isArray(networks)) {
    return [...networks]
      .map(n => ({ name: String(n), aliases: [] as readonly string[], ipv4Address: '' }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }
  if (isRecord(networks)) {
    return Object.entries(networks)
      .map(([name, config]): NetworkInfo => {
        const aliases = isRecord(config) && Array.isArray(config['aliases'])
          ? config['aliases'].map(String)
          : []
        const ipv4Address = isRecord(config) && typeof config['ipv4_address'] === 'string'
          ? config['ipv4_address']
          : ''
        return { name, aliases, ipv4Address }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }
  return []
}

function extractEnvironment(env: unknown): ReadonlyMap<string, string> {
  const result = new Map<string, string>()
  if (isRecord(env)) {
    for (const [key, value] of Object.entries(env)) {
      result.set(key, String(value ?? ''))
    }
  } else if (Array.isArray(env)) {
    for (const entry of env) {
      const str = String(entry)
      const eqIdx = str.indexOf('=')
      if (eqIdx >= 0) {
        result.set(str.slice(0, eqIdx), str.slice(eqIdx + 1))
      } else {
        result.set(str, '')
      }
    }
  }
  return result
}

function formatResourceLimits(resources: Record<string, unknown>): string {
  const parts: string[] = []
  for (const [section, value] of Object.entries(resources)) {
    if (isRecord(value)) {
      const fields = Object.entries(value).map(([k, v]) => `${k}=${v}`)
      if (fields.length > 0) {
        parts.push(`${section}: ${fields.join(', ')}`)
      }
    }
  }
  return parts.join('; ')
}

function extractExtras(service: Record<string, unknown>): ReadonlyMap<string, string> {
  const extras = new Map<string, string>()

  const simpleKeys = ['restart', 'hostname', 'container_name'] as const
  for (const key of simpleKeys) {
    const value = service[key]
    if (value != null && value !== '') {
      extras.set(key, String(value))
    }
  }

  const dependsOn = service['depends_on']
  if (Array.isArray(dependsOn)) {
    extras.set('depends_on', dependsOn.map(String).join(', '))
  } else if (isRecord(dependsOn)) {
    extras.set('depends_on', Object.keys(dependsOn).join(', '))
  }

  const deploy = service['deploy']
  if (isRecord(deploy)) {
    const resources = deploy['resources']
    if (isRecord(resources)) {
      const formatted = formatResourceLimits(resources)
      if (formatted) {
        extras.set('deploy.resources', formatted)
      }
    }
  }

  return extras
}

function parseService(name: string, service: Record<string, unknown>): ServiceInfo {
  return {
    name,
    image: typeof service['image'] === 'string' ? service['image'] : '',
    ports: normalizePorts(service['ports']),
    volumes: normalizeVolumes(service['volumes']),
    networks: extractNetworks(service['networks']),
    environment: extractEnvironment(service['environment']),
    extras: extractExtras(service),
  }
}

export function parseServices(compose: Record<string, unknown>): readonly ServiceInfo[] {
  const services = compose['services']
  if (!isRecord(services)) return []

  const result: ServiceInfo[] = []
  for (const [name, svc] of Object.entries(services)) {
    if (isRecord(svc)) {
      result.push(parseService(name, svc))
    }
  }

  return [...result].sort((a, b) => a.name.localeCompare(b.name))
}
