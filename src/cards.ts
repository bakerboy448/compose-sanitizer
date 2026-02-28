import { el } from './dom'
import type { ServiceInfo } from './services'

const VOLUME_MODES: ReadonlySet<string> = new Set([
  'ro', 'rw', 'z', 'Z', 'shared', 'slave', 'private', 'rshared', 'rslave', 'rprivate',
  'consistent', 'cached', 'delegated', 'nocopy',
])

function isVolumeMode(segment: string): boolean {
  if (segment === '') return false
  return segment.split(',').every(opt => VOLUME_MODES.has(opt))
}

export interface ParsedVolume {
  readonly source: string
  readonly target: string
  readonly mode: string
}

export function parseVolume(vol: string): ParsedVolume {
  const parts = vol.split(':')
  if (parts.length >= 3) {
    const last = parts[parts.length - 1]!
    if (isVolumeMode(last)) {
      return {
        source: parts.slice(0, -2).join(':'),
        target: parts[parts.length - 2]!,
        mode: last,
      }
    }
  }
  if (parts.length >= 2) {
    return { source: parts[0]!, target: parts.slice(1).join(':'), mode: '' }
  }
  return { source: vol, target: '', mode: '' }
}

function renderVolumesSection(volumes: readonly string[]): HTMLElement {
  const section = el('div', { className: 'card-section' })
  const labelEl = el('div', { className: 'card-label' })
  labelEl.textContent = 'Volumes'
  section.appendChild(labelEl)

  const grid = el('div', { className: 'vol-grid' })
  for (const vol of volumes) {
    const parsed = parseVolume(vol)

    const sourceEl = el('span', { className: 'vol-source' })
    sourceEl.textContent = parsed.source
    sourceEl.title = parsed.source
    grid.appendChild(sourceEl)

    const arrowEl = el('span', { className: 'vol-arrow' })
    arrowEl.textContent = '\u2192'
    grid.appendChild(arrowEl)

    const targetEl = el('span', { className: 'vol-target' })
    targetEl.textContent = parsed.target
    targetEl.title = parsed.target
    grid.appendChild(targetEl)

    const modeEl = el('span', { className: 'vol-mode' })
    modeEl.textContent = parsed.mode
    grid.appendChild(modeEl)
  }

  section.appendChild(grid)
  return section
}

function renderListSection(label: string, items: readonly string[]): HTMLElement {
  const section = el('div', { className: 'card-section' })
  const labelEl = el('div', { className: 'card-label' })
  labelEl.textContent = label
  section.appendChild(labelEl)

  const valueEl = el('div', { className: 'card-value' })
  valueEl.textContent = items.join('\n')
  section.appendChild(valueEl)

  return section
}

function renderMapSection(label: string, entries: ReadonlyMap<string, string>): HTMLElement {
  const section = el('div', { className: 'card-section' })
  const labelEl = el('div', { className: 'card-label' })
  labelEl.textContent = label
  section.appendChild(labelEl)

  const valueEl = el('div', { className: 'card-value' })
  const lines = Array.from(entries).map(([k, v]) => `${k}=${v}`)
  valueEl.textContent = lines.join('\n')
  section.appendChild(valueEl)

  return section
}

function renderCard(service: ServiceInfo): HTMLElement {
  const card = el('div', { className: 'card' })

  const header = el('div', { className: 'card-header' })
  header.textContent = service.name
  card.appendChild(header)

  // Image (always shown if present)
  if (service.image) {
    const section = el('div', { className: 'card-section' })
    const label = el('div', { className: 'card-label' })
    label.textContent = 'Image'
    section.appendChild(label)
    const value = el('div', { className: 'card-value' })
    value.textContent = service.image
    section.appendChild(value)
    card.appendChild(section)
  }

  if (service.ports.length > 0) {
    card.appendChild(renderListSection('Ports', service.ports))
  }

  if (service.volumes.length > 0) {
    card.appendChild(renderVolumesSection(service.volumes))
  }

  if (service.networks.length > 0) {
    card.appendChild(renderListSection('Networks', service.networks))
  }

  if (service.environment.size > 0) {
    card.appendChild(renderMapSection('Environment', service.environment))
  }

  // Extras rendered as individual labeled fields
  for (const [key, value] of service.extras) {
    const section = el('div', { className: 'card-section' })
    const label = el('div', { className: 'card-label' })
    label.textContent = key
    section.appendChild(label)
    const valueEl = el('div', { className: 'card-value' })
    valueEl.textContent = value
    section.appendChild(valueEl)
    card.appendChild(section)
  }

  return card
}

export function renderCards(services: readonly ServiceInfo[]): HTMLElement {
  const container = el('div', { className: 'cards-container' })
  for (const service of services) {
    container.appendChild(renderCard(service))
  }
  return container
}
