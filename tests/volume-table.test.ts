import { describe, it, expect } from 'vitest'
import { renderVolumeTable } from '../src/volume-table'
import type { ServiceInfo } from '../src/services'

function makeService(overrides: Partial<ServiceInfo> & { name: string }): ServiceInfo {
  return {
    image: '',
    ports: [],
    volumes: [],
    networks: [],
    environment: new Map(),
    extras: new Map(),
    ...overrides,
  }
}

describe('renderVolumeTable', () => {
  it('returns empty div for no services', () => {
    const table = renderVolumeTable([])
    expect(table.querySelector('table')).toBeNull()
  })

  it('returns empty div for services with no volumes', () => {
    const services = [makeService({ name: 'app', image: 'nginx' })]
    const table = renderVolumeTable(services)
    expect(table.querySelector('table')).toBeNull()
  })

  it('renders a table with host path rows and service columns', () => {
    const services = [
      makeService({ name: 'plex', image: 'plex', volumes: ['/config:/config', '/mnt/data/media:/data'] }),
      makeService({ name: 'radarr', image: 'radarr', volumes: ['/config:/config', '/mnt/data/usenet:/data/usenet'] }),
    ]
    const container = renderVolumeTable(services)
    const table = container.querySelector('table')
    expect(table).not.toBeNull()

    // Header: Host Path | plex | radarr
    const ths = table!.querySelectorAll('th')
    expect(ths).toHaveLength(3)
    expect(ths[0]!.textContent).toBe('Host Path')
    expect(ths[1]!.textContent).toBe('plex')
    expect(ths[2]!.textContent).toBe('radarr')
  })

  it('sorts host paths alphabetically', () => {
    const services = [
      makeService({ name: 'app', image: 'img', volumes: ['/z:/z', '/a:/a', '/m:/m'] }),
    ]
    const container = renderVolumeTable(services)
    const rows = container.querySelectorAll('tbody tr')
    expect(rows[0]!.querySelector('td')!.textContent).toBe('/a')
    expect(rows[1]!.querySelector('td')!.textContent).toBe('/m')
    expect(rows[2]!.querySelector('td')!.textContent).toBe('/z')
  })

  it('shows dash for services that do not mount a host path', () => {
    const services = [
      makeService({ name: 'plex', image: 'plex', volumes: ['/config:/config'] }),
      makeService({ name: 'radarr', image: 'radarr', volumes: ['/data:/data'] }),
    ]
    const container = renderVolumeTable(services)
    const rows = container.querySelectorAll('tbody tr')

    // /config row: plex has it, radarr doesn't
    const configCells = rows[0]!.querySelectorAll('td')
    expect(configCells[0]!.textContent).toBe('/config')
    expect(configCells[1]!.textContent).toBe('/config')
    expect(configCells[2]!.textContent).toBe('\u2014')

    // /data row: plex doesn't have it, radarr does
    const dataCells = rows[1]!.querySelectorAll('td')
    expect(dataCells[0]!.textContent).toBe('/data')
    expect(dataCells[1]!.textContent).toBe('\u2014')
    expect(dataCells[2]!.textContent).toBe('/data')
  })

  it('includes mode in cell when present', () => {
    const services = [
      makeService({ name: 'app', image: 'img', volumes: ['/data:/data:ro'] }),
    ]
    const container = renderVolumeTable(services)
    const cell = container.querySelectorAll('tbody td')[1]
    expect(cell!.textContent).toBe('/data (ro)')
  })

  it('handles single service with multiple volumes', () => {
    const services = [
      makeService({ name: 'app', image: 'img', volumes: ['/a:/x', '/b:/y:ro'] }),
    ]
    const container = renderVolumeTable(services)
    const rows = container.querySelectorAll('tbody tr')
    expect(rows).toHaveLength(2)
  })

  it('deduplicates host paths across services', () => {
    const services = [
      makeService({ name: 'a', image: 'img', volumes: ['/shared:/data'] }),
      makeService({ name: 'b', image: 'img', volumes: ['/shared:/media:ro'] }),
    ]
    const container = renderVolumeTable(services)
    const rows = container.querySelectorAll('tbody tr')
    // Only one row for /shared
    expect(rows).toHaveLength(1)
    const cells = rows[0]!.querySelectorAll('td')
    expect(cells[0]!.textContent).toBe('/shared')
    expect(cells[1]!.textContent).toBe('/data')
    expect(cells[2]!.textContent).toBe('/media (ro)')
  })
})
