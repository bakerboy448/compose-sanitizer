import { parseVolume } from './cards'
import type { ServiceInfo } from './services'

export interface VolumeMapping {
  readonly target: string
  readonly mode: string
}

export interface VolumeMatrix {
  readonly hostPaths: readonly string[]
  readonly matrix: ReadonlyMap<string, ReadonlyMap<string, VolumeMapping>>
}

export function buildVolumeMatrix(services: readonly ServiceInfo[]): VolumeMatrix {
  const entries = new Map<string, ReadonlyMap<string, VolumeMapping>>()

  for (const svc of services) {
    for (const vol of svc.volumes) {
      const parsed = parseVolume(vol)
      if (!parsed.source || !parsed.target) continue

      const existing = entries.get(parsed.source)
      const merged = new Map(existing ?? [])
      merged.set(svc.name, { target: parsed.target, mode: parsed.mode })
      entries.set(parsed.source, merged)
    }
  }

  const hostPaths = [...entries.keys()].sort()
  return { hostPaths, matrix: entries }
}
