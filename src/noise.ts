const COMPOSE_LABEL_PREFIX = 'com.docker.compose.'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isEmpty(value: unknown): boolean {
  if (value == null) return true
  if (value === '') return true
  if (Array.isArray(value) && value.length === 0) return true
  if (isRecord(value) && Object.keys(value).length === 0) return true
  return false
}

function stripComposeLabelsDict(labels: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(labels)) {
    if (!key.startsWith(COMPOSE_LABEL_PREFIX)) {
      result[key] = value
    }
  }
  return result
}

function stripComposeLabelsArray(labels: readonly unknown[]): readonly unknown[] {
  return labels.filter(item => {
    const str = String(item)
    return !str.startsWith(COMPOSE_LABEL_PREFIX)
  })
}

function isDefaultOnlyNetwork(networks: Record<string, unknown>): boolean {
  const keys = Object.keys(networks)
  if (keys.length !== 1 || keys[0] !== 'default') return false
  const defaultNet = networks['default']
  if (defaultNet == null) return true
  if (!isRecord(defaultNet)) return false
  const entries = Object.entries(defaultNet).filter(([, v]) => v != null && v !== false)
  return entries.length === 0
}

function cleanFields(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (!isEmpty(value)) {
      result[key] = value
    }
  }
  return result
}

function stripServiceNoise(service: Record<string, unknown>): Record<string, unknown> {
  let result: Record<string, unknown> = { ...service }

  const labels = service['labels']
  if (isRecord(labels)) {
    const cleaned = stripComposeLabelsDict(labels)
    result = { ...result, labels: cleaned }
  } else if (Array.isArray(labels)) {
    const cleaned = stripComposeLabelsArray(labels)
    result = { ...result, labels: cleaned }
  }

  return cleanFields(result)
}

export function stripNoise(compose: Record<string, unknown>): Record<string, unknown> {
  let result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(compose)) {
    if (key === 'version' || key === 'name') continue
    result[key] = value
  }

  const services = result['services']
  if (isRecord(services)) {
    const newServices: Record<string, unknown> = {}
    for (const [name, svc] of Object.entries(services)) {
      newServices[name] = isRecord(svc) ? stripServiceNoise(svc) : svc
    }
    result = { ...result, services: newServices }
  }

  const networks = result['networks']
  if (isRecord(networks) && isDefaultOnlyNetwork(networks)) {
    const { networks: _, ...rest } = result
    result = rest
  }

  const volumes = result['volumes']
  if (isRecord(volumes) && Object.keys(volumes).length === 0) {
    const { volumes: _, ...rest } = result
    result = rest
  }

  return result
}
