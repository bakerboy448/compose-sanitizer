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

  const header = '| Service | Image | Ports | Volumes | Networks |'
  const separator = '| --- | --- | --- | --- | --- |'

  const rows = services.map(svc => {
    const cells = [
      escapeCell(svc.name),
      escapeCell(svc.image),
      escapeCell(joinField([...svc.ports])),
      escapeCell(joinField([...svc.volumes])),
      escapeCell(joinField([...svc.networks])),
    ]
    return `| ${cells.join(' | ')} |`
  })

  return [header, separator, ...rows].join('\n')
}
