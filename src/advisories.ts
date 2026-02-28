export interface Advisory {
  readonly type: 'hardlinks'
  readonly message: string
  readonly link: string
  readonly services: readonly string[]
}

const MEDIA_CONTAINER_PATHS = new Set([
  '/tv', '/movies', '/series', '/music', '/books', '/anime',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getContainerPath(volumeStr: string): string {
  const parts = volumeStr.split(':')
  if (parts.length >= 2) {
    const containerPart = parts[1] ?? ''
    return containerPart.replace(/:.*$/, '')
  }
  return ''
}

function hasMediaMount(volumes: readonly unknown[]): boolean {
  return volumes.some(vol => {
    if (typeof vol === 'string') {
      return MEDIA_CONTAINER_PATHS.has(getContainerPath(vol))
    }
    if (isRecord(vol) && typeof vol['target'] === 'string') {
      return MEDIA_CONTAINER_PATHS.has(vol['target'])
    }
    return false
  })
}

export function detectAdvisories(compose: Record<string, unknown>): readonly Advisory[] {
  const services = compose['services']
  if (!isRecord(services)) return []

  const affectedServices: string[] = []

  for (const [name, svc] of Object.entries(services)) {
    if (!isRecord(svc)) continue
    const volumes = svc['volumes']
    if (!Array.isArray(volumes)) continue
    if (hasMediaMount(volumes)) {
      affectedServices.push(name)
    }
  }

  if (affectedServices.length === 0) return []

  return [
    {
      type: 'hardlinks',
      message:
        'Separate /tv, /movies etc. mounts prevent hardlinks. Consider a unified media root mount.',
      link: 'https://trash-guides.info/Hardlinks/Hardlinks-and-Instant-Moves/',
      services: [...affectedServices],
    },
  ]
}
