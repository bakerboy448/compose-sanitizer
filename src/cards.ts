import { el } from './dom'
import type { ServiceInfo } from './services'

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
    card.appendChild(renderListSection('Volumes', service.volumes))
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
