import { describe, it, expect } from 'vitest'
import { renderCards } from '../src/cards'
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

describe('renderCards', () => {
  it('returns a container with correct class', () => {
    const container = renderCards([])
    expect(container.className).toBe('cards-container')
  })

  it('renders no cards for empty array', () => {
    const container = renderCards([])
    expect(container.children).toHaveLength(0)
  })

  it('renders one card per service', () => {
    const services = [
      makeService({ name: 'sonarr', image: 'linuxserver/sonarr' }),
      makeService({ name: 'radarr', image: 'linuxserver/radarr' }),
    ]
    const container = renderCards(services)
    expect(container.children).toHaveLength(2)
  })

  it('renders service name as card header', () => {
    const services = [makeService({ name: 'sonarr', image: 'nginx' })]
    const container = renderCards(services)
    const header = container.querySelector('.card-header')
    expect(header).not.toBeNull()
    expect(header!.textContent).toBe('sonarr')
  })

  it('renders image field', () => {
    const services = [makeService({ name: 'app', image: 'nginx:latest' })]
    const container = renderCards(services)
    const labels = container.querySelectorAll('.card-label')
    const imageLabel = Array.from(labels).find(l => l.textContent === 'Image')
    expect(imageLabel).toBeDefined()
    const value = imageLabel!.nextElementSibling
    expect(value!.textContent).toBe('nginx:latest')
  })

  it('omits empty sections', () => {
    const services = [makeService({ name: 'app', image: 'nginx' })]
    const container = renderCards(services)
    const labels = container.querySelectorAll('.card-label')
    const labelTexts = Array.from(labels).map(l => l.textContent)
    // Should have Image but not Ports, Volumes, Networks, Environment, Extras
    expect(labelTexts).toContain('Image')
    expect(labelTexts).not.toContain('Ports')
    expect(labelTexts).not.toContain('Volumes')
    expect(labelTexts).not.toContain('Networks')
    expect(labelTexts).not.toContain('Environment')
  })

  it('renders ports when present', () => {
    const services = [makeService({ name: 'app', image: 'nginx', ports: ['80:80', '443:443'] })]
    const container = renderCards(services)
    const labels = container.querySelectorAll('.card-label')
    const portsLabel = Array.from(labels).find(l => l.textContent === 'Ports')
    expect(portsLabel).toBeDefined()
    const value = portsLabel!.nextElementSibling
    expect(value!.textContent).toContain('80:80')
    expect(value!.textContent).toContain('443:443')
  })

  it('renders environment variables correctly', () => {
    const env = new Map([['PUID', '1000'], ['TZ', 'UTC']])
    const services = [makeService({ name: 'app', image: 'nginx', environment: env })]
    const container = renderCards(services)
    const labels = container.querySelectorAll('.card-label')
    const envLabel = Array.from(labels).find(l => l.textContent === 'Environment')
    expect(envLabel).toBeDefined()
    const value = envLabel!.nextElementSibling
    expect(value!.textContent).toContain('PUID=1000')
    expect(value!.textContent).toContain('TZ=UTC')
  })

  it('renders extras when present', () => {
    const extras = new Map([['restart', 'unless-stopped']])
    const services = [makeService({ name: 'app', image: 'nginx', extras })]
    const container = renderCards(services)
    const labels = container.querySelectorAll('.card-label')
    const extrasTexts = Array.from(labels).map(l => l.textContent)
    expect(extrasTexts).toContain('restart')
  })

  it('does not use innerHTML (no XSS vector)', () => {
    const services = [makeService({ name: '<script>alert(1)</script>', image: '<img onerror=alert(1)>' })]
    const container = renderCards(services)
    const html = container.outerHTML
    // Script tags must be entity-encoded, not rendered as real elements
    expect(html).not.toContain('<script>')
    // The image tag must be entity-encoded, not a real img element
    expect(html).toContain('&lt;img')
    expect(container.querySelectorAll('script')).toHaveLength(0)
    expect(container.querySelectorAll('img')).toHaveLength(0)
  })
})
