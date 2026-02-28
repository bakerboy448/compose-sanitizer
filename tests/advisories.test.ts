import { describe, it, expect } from 'vitest'
import { detectAdvisories } from '../src/advisories'

describe('detectAdvisories', () => {
  it('detects separate /tv mount', () => {
    const compose = {
      services: {
        sonarr: {
          image: 'linuxserver/sonarr',
          volumes: ['/mnt/data/tv:/tv'],
        },
      },
    }
    const advisories = detectAdvisories(compose)
    expect(advisories).toHaveLength(1)
    expect(advisories[0]?.type).toBe('hardlinks')
    expect(advisories[0]?.services).toContain('sonarr')
  })

  it('detects separate /movies mount', () => {
    const compose = {
      services: {
        radarr: {
          volumes: ['/mnt/data/movies:/movies'],
        },
      },
    }
    const advisories = detectAdvisories(compose)
    expect(advisories).toHaveLength(1)
    expect(advisories[0]?.type).toBe('hardlinks')
  })

  it('detects /series, /music, /books, /anime mounts', () => {
    const compose = {
      services: {
        app: {
          volumes: [
            '/data/series:/series',
            '/data/music:/music',
            '/data/books:/books',
            '/data/anime:/anime',
          ],
        },
      },
    }
    const advisories = detectAdvisories(compose)
    expect(advisories).toHaveLength(1)
    expect(advisories[0]?.services).toContain('app')
  })

  it('does not trigger for /config', () => {
    const compose = {
      services: {
        app: {
          volumes: ['/home/user/.config:/config'],
        },
      },
    }
    const advisories = detectAdvisories(compose)
    expect(advisories).toHaveLength(0)
  })

  it('does not trigger for unified root like /data/media/tv', () => {
    const compose = {
      services: {
        sonarr: {
          volumes: ['/mnt/data:/data'],
        },
      },
    }
    const advisories = detectAdvisories(compose)
    expect(advisories).toHaveLength(0)
  })

  it('returns single advisory for multiple services with separate media mounts', () => {
    const compose = {
      services: {
        sonarr: {
          volumes: ['/mnt/tv:/tv'],
        },
        radarr: {
          volumes: ['/mnt/movies:/movies'],
        },
      },
    }
    const advisories = detectAdvisories(compose)
    expect(advisories).toHaveLength(1)
    expect(advisories[0]?.services).toContain('sonarr')
    expect(advisories[0]?.services).toContain('radarr')
  })

  it('returns no advisories when no media mounts', () => {
    const compose = {
      services: {
        nginx: {
          volumes: ['/etc/nginx:/etc/nginx:ro'],
        },
      },
    }
    const advisories = detectAdvisories(compose)
    expect(advisories).toHaveLength(0)
  })

  it('handles services without volumes', () => {
    const compose = {
      services: {
        app: {
          image: 'nginx',
        },
      },
    }
    const advisories = detectAdvisories(compose)
    expect(advisories).toHaveLength(0)
  })

  it('handles empty services', () => {
    const compose = { services: {} }
    const advisories = detectAdvisories(compose)
    expect(advisories).toHaveLength(0)
  })

  it('handles compose without services key', () => {
    const compose = { networks: {} }
    const advisories = detectAdvisories(compose)
    expect(advisories).toHaveLength(0)
  })

  it('includes a link to TRaSH Guides', () => {
    const compose = {
      services: {
        sonarr: { volumes: ['/tv:/tv'] },
      },
    }
    const advisories = detectAdvisories(compose)
    expect(advisories[0]?.link).toContain('trash-guides.info')
  })
})
