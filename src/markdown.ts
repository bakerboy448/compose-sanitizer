import type { ServiceInfo } from './services'

function escapeCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

function joinField(values: readonly string[]): string {
  return values.join(', ')
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
