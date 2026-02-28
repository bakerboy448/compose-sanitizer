import { describe, it, expect } from 'vitest'
import { generateMarkdownTable } from '../src/markdown'
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
    // Header row
    expect(lines[0]).toBe('| Service | Image | Ports | Volumes | Networks |')
    // Separator
    expect(lines[1]).toBe('| --- | --- | --- | --- | --- |')
    // Data row
    expect(lines[2]).toContain('sonarr')
    expect(lines[2]).toContain('linuxserver/sonarr:latest')
    expect(lines[2]).toContain('8989:8989')
    expect(lines[2]).toContain('/config:/config, /data:/data')
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
    // Data row should have empty cells for ports, volumes, networks
    expect(lines[2]).toBe('| minimal | nginx |  |  |  |')
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
