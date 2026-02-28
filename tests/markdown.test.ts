import { describe, it, expect } from 'vitest'
import { generateMarkdownTable, generateVolumeComparisonMarkdown } from '../src/markdown'
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

describe('generateMarkdownTable', () => {
  it('returns empty string for no services', () => {
    expect(generateMarkdownTable([])).toBe('')
  })

  it('produces valid markdown table for a single service', () => {
    const services = [
      makeService({
        name: 'sonarr',
        image: 'linuxserver/sonarr:latest',
        ports: ['8989:8989'],
        volumes: ['/config:/config', '/data:/data'],
        networks: ['default'],
      }),
    ]
    const result = generateMarkdownTable(services)
    const lines = result.split('\n')
    // Header row (no Volumes column — volumes are in separate comparison table)
    expect(lines[0]).toBe('| Service | Image | Ports | Networks |')
    // Separator
    expect(lines[1]).toBe('| --- | --- | --- | --- |')
    // Data row
    expect(lines[2]).toContain('sonarr')
    expect(lines[2]).toContain('linuxserver/sonarr:latest')
    expect(lines[2]).toContain('8989:8989')
    expect(lines[2]).toContain('default')
  })

  it('produces correct rows for multiple services', () => {
    const services = [
      makeService({ name: 'alpha', image: 'alpha:1', ports: ['80:80'] }),
      makeService({ name: 'beta', image: 'beta:2', volumes: ['/data:/data'] }),
    ]
    const result = generateMarkdownTable(services)
    const lines = result.split('\n')
    expect(lines).toHaveLength(4) // header + separator + 2 data rows
    expect(lines[2]).toContain('alpha')
    expect(lines[3]).toContain('beta')
  })

  it('produces empty cells for missing fields, not undefined', () => {
    const services = [
      makeService({ name: 'minimal', image: 'nginx' }),
    ]
    const result = generateMarkdownTable(services)
    expect(result).not.toContain('undefined')
    const lines = result.split('\n')
    // Data row should have empty cells for ports, networks
    expect(lines[2]).toBe('| minimal | nginx |  |  |')
  })

  it('includes extras columns dynamically', () => {
    const services = [
      makeService({ name: 'app', image: 'nginx', extras: new Map([['restart', 'unless-stopped'], ['hostname', 'app-host']]) }),
      makeService({ name: 'db', image: 'postgres', extras: new Map([['restart', 'always']]) }),
    ]
    const result = generateMarkdownTable(services)
    const lines = result.split('\n')
    // Header includes extras
    expect(lines[0]).toContain('restart')
    expect(lines[0]).toContain('hostname')
    // app row has both
    expect(lines[2]).toContain('unless-stopped')
    expect(lines[2]).toContain('app-host')
    // db row has restart but empty hostname
    expect(lines[3]).toContain('always')
  })

  it('escapes pipe characters in field values', () => {
    const services = [
      makeService({ name: 'app', image: 'my|image' }),
    ]
    const result = generateMarkdownTable(services)
    expect(result).toContain('my\\|image')
    expect(result).not.toContain('my|image')
  })

  it('joins multi-value fields with comma separator', () => {
    const services = [
      makeService({
        name: 'app',
        image: 'nginx',
        ports: ['80:80', '443:443'],
        networks: ['frontend', 'backend'],
      }),
    ]
    const result = generateMarkdownTable(services)
    const lines = result.split('\n')
    expect(lines[2]).toContain('80:80, 443:443')
    expect(lines[2]).toContain('frontend, backend')
  })

  it('escapes newlines in values', () => {
    const services = [
      makeService({ name: 'app', image: 'nginx\nlatest' }),
    ]
    const result = generateMarkdownTable(services)
    expect(result).not.toContain('\n\n') // no double newlines in data
    expect(result).toContain('nginx latest') // newline replaced with space
  })
})

describe('generateVolumeComparisonMarkdown', () => {
  it('returns empty string for no services', () => {
    expect(generateVolumeComparisonMarkdown([])).toBe('')
  })

  it('returns empty string for services with no volumes', () => {
    const services = [makeService({ name: 'app', image: 'nginx' })]
    expect(generateVolumeComparisonMarkdown(services)).toBe('')
  })

  it('produces a markdown table with host paths as rows', () => {
    const services = [
      makeService({ name: 'plex', image: 'plex', volumes: ['/config:/config', '/mnt/data:/data'] }),
      makeService({ name: 'radarr', image: 'radarr', volumes: ['/config:/config'] }),
    ]
    const result = generateVolumeComparisonMarkdown(services)
    const lines = result.split('\n')
    // Header
    expect(lines[0]).toBe('| Host Path | plex | radarr |')
    // Separator
    expect(lines[1]).toBe('| --- | --- | --- |')
    // Data rows sorted alphabetically
    expect(lines[2]).toContain('/config')
    expect(lines[2]).toContain('/config')
    expect(lines[3]).toContain('/mnt/data')
  })

  it('shows em dash for missing mounts', () => {
    const services = [
      makeService({ name: 'a', image: 'img', volumes: ['/x:/x'] }),
      makeService({ name: 'b', image: 'img', volumes: ['/y:/y'] }),
    ]
    const result = generateVolumeComparisonMarkdown(services)
    expect(result).toContain('\u2014')
  })

  it('includes mode annotation in cells', () => {
    const services = [
      makeService({ name: 'app', image: 'img', volumes: ['/data:/data:ro'] }),
    ]
    const result = generateVolumeComparisonMarkdown(services)
    expect(result).toContain('/data (ro)')
  })

  it('escapes pipe characters in paths', () => {
    const services = [
      makeService({ name: 'app', image: 'img', volumes: ['/a|b:/c'] }),
    ]
    const result = generateVolumeComparisonMarkdown(services)
    expect(result).toContain('/a\\|b')
  })
})
