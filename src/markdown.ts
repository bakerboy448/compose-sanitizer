import { buildVolumeMatrix } from './volume-utils'
import type { ServiceInfo } from './services'

function escapeCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

function joinField(values: readonly string[]): string {
  return values.join(', ')
}

export function generateVolumeComparisonMarkdown(services: readonly ServiceInfo[]): string {
  if (services.length === 0) return ''

  const { hostPaths, matrix } = buildVolumeMatrix(services)
  if (hostPaths.length === 0) return ''

  const header = `| Host Path | ${services.map(s => escapeCell(s.name)).join(' | ')} |`
  const separator = `| --- | ${services.map(() => '---').join(' | ')} |`

  const rows = hostPaths.map(hp => {
    const serviceMap = matrix.get(hp) ?? new Map()
    const cells = services.map(svc => {
      const mapping = serviceMap.get(svc.name)
      if (!mapping) return '\u2014'
      const cell = mapping.mode ? `${mapping.target} (${mapping.mode})` : mapping.target
      return escapeCell(cell)
    })
    return `| ${escapeCell(hp)} | ${cells.join(' | ')} |`
  })

  return [header, separator, ...rows].join('\n')
}

export function generateMarkdownTable(services: readonly ServiceInfo[]): string {
  if (services.length === 0) return ''

  // Collect extra keys across all services
  const extraKeys: string[] = []
  const seen = new Set<string>()
  for (const svc of services) {
    for (const key of svc.extras.keys()) {
      if (!seen.has(key)) {
        seen.add(key)
        extraKeys.push(key)
      }
    }
  }

  const columns = ['Service', 'Image', 'Ports', 'Networks', ...extraKeys]
  const header = `| ${columns.join(' | ')} |`
  const separator = `| ${columns.map(() => '---').join(' | ')} |`

  const rows = services.map(svc => {
    const baseCells = [
      escapeCell(svc.name),
      escapeCell(svc.image),
      escapeCell(joinField([...svc.ports])),
      escapeCell(joinField(svc.networks.map(n => n.name))),
    ]
    const extraCells = extraKeys.map(key => escapeCell(svc.extras.get(key) ?? ''))
    return `| ${[...baseCells, ...extraCells].join(' | ')} |`
  })

  return [header, separator, ...rows].join('\n')
}
