import { el } from './dom'
import { buildVolumeMatrix, type VolumeMapping } from './volume-utils'
import type { ServiceInfo } from './services'

function formatCell(mapping: VolumeMapping): string {
  return mapping.mode ? `${mapping.target} (${mapping.mode})` : mapping.target
}

export function renderVolumeTable(services: readonly ServiceInfo[]): HTMLElement {
  const wrap = el('div', { className: 'volume-table-wrap' })

  const { hostPaths, matrix } = buildVolumeMatrix(services)
  if (hostPaths.length === 0) return wrap

  const table = el('table', { className: 'volume-table' })

  // Header
  const thead = el('thead')
  const headerRow = el('tr')
  const hostTh = el('th')
  hostTh.textContent = 'Host Path'
  headerRow.appendChild(hostTh)
  for (const svc of services) {
    const th = el('th')
    th.textContent = svc.name
    headerRow.appendChild(th)
  }
  thead.appendChild(headerRow)
  table.appendChild(thead)

  // Body
  const tbody = el('tbody')
  for (const hostPath of hostPaths) {
    const row = el('tr')

    const pathTd = el('td')
    pathTd.textContent = hostPath
    row.appendChild(pathTd)

    const serviceMap = matrix.get(hostPath)
    for (const svc of services) {
      const mapping = serviceMap?.get(svc.name)
      const td = el('td')
      if (mapping) {
        td.textContent = formatCell(mapping)
      } else {
        td.textContent = '\u2014'
        td.className = 'vol-empty'
      }
      row.appendChild(td)
    }

    tbody.appendChild(row)
  }
  table.appendChild(tbody)

  wrap.appendChild(table)
  return wrap
}
