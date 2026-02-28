import { describe, it, expect } from 'vitest'
import { parseServices, type ServiceInfo } from '../src/services'

describe('parseServices', () => {
  it('returns empty array for empty compose', () => {
    expect(parseServices({})).toEqual([])
  })

  it('returns empty array when services key is missing', () => {
    expect(parseServices({ networks: {} })).toEqual([])
  })

  it('returns empty array when services is not an object', () => {
    expect(parseServices({ services: 'invalid' })).toEqual([])
  })

  it('parses a basic service with image', () => {
    const compose = {
      services: {
        web: { image: 'nginx:latest' },
      },
    }
    const result = parseServices(compose)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('web')
    expect(result[0].image).toBe('nginx:latest')
  })

  it('sorts services alphabetically by name', () => {
    const compose = {
      services: {
        zeta: { image: 'zeta:1' },
        alpha: { image: 'alpha:1' },
        mid: { image: 'mid:1' },
      },
    }
    const result = parseServices(compose)
    expect(result.map(s => s.name)).toEqual(['alpha', 'mid', 'zeta'])
  })

  it('returns empty string for missing image', () => {
    const compose = {
      services: {
        app: { build: './app' },
      },
    }
    const result = parseServices(compose)
    expect(result[0].image).toBe('')
  })

  // Port normalization
  describe('port normalization', () => {
    it('handles short string syntax', () => {
      const compose = {
        services: {
          app: { image: 'nginx', ports: ['8080:80', '443:443/udp'] },
        },
      }
      const result = parseServices(compose)
      expect(result[0].ports).toEqual(['8080:80', '443:443/udp'])
    })

    it('handles long-form object syntax', () => {
      const compose = {
        services: {
          app: {
            image: 'nginx',
            ports: [
              { target: 80, published: 8080, protocol: 'tcp' },
              { target: 443, published: 443 },
            ],
          },
        },
      }
      const result = parseServices(compose)
      expect(result[0].ports).toEqual(['8080:80/tcp', '443:443'])
    })

    it('handles long-form with host_ip', () => {
      const compose = {
        services: {
          app: {
            image: 'nginx',
            ports: [
              { target: 80, published: 8080, protocol: 'tcp', host_ip: '127.0.0.1' },
            ],
          },
        },
      }
      const result = parseServices(compose)
      expect(result[0].ports).toEqual(['127.0.0.1:8080:80/tcp'])
    })

    it('handles bare numeric ports', () => {
      const compose = {
        services: {
          app: { image: 'nginx', ports: [8080, 443] },
        },
      }
      const result = parseServices(compose)
      expect(result[0].ports).toEqual(['8080', '443'])
    })

    it('returns empty array when no ports', () => {
      const compose = {
        services: { app: { image: 'nginx' } },
      }
      const result = parseServices(compose)
      expect(result[0].ports).toEqual([])
    })
  })

  // Volume normalization
  describe('volume normalization', () => {
    it('handles short string syntax', () => {
      const compose = {
        services: {
          app: { image: 'nginx', volumes: ['./data:/app/data:rw', '/config:/config'] },
        },
      }
      const result = parseServices(compose)
      expect(result[0].volumes).toEqual(['./data:/app/data:rw', '/config:/config'])
    })

    it('handles long-form object syntax', () => {
      const compose = {
        services: {
          app: {
            image: 'nginx',
            volumes: [
              { type: 'bind', source: './data', target: '/app/data' },
              { type: 'volume', source: 'mydata', target: '/data', read_only: true },
            ],
          },
        },
      }
      const result = parseServices(compose)
      expect(result[0].volumes).toEqual(['./data:/app/data', 'mydata:/data:ro'])
    })

    it('returns empty array when no volumes', () => {
      const compose = {
        services: { app: { image: 'nginx' } },
      }
      const result = parseServices(compose)
      expect(result[0].volumes).toEqual([])
    })
  })

  // Network extraction
  describe('network extraction', () => {
    it('extracts networks from dict form', () => {
      const compose = {
        services: {
          app: {
            image: 'nginx',
            networks: { frontend: {}, backend: null },
          },
        },
      }
      const result = parseServices(compose)
      expect(result[0].networks).toEqual(['backend', 'frontend'])
    })

    it('extracts networks from array form', () => {
      const compose = {
        services: {
          app: {
            image: 'nginx',
            networks: ['frontend', 'backend'],
          },
        },
      }
      const result = parseServices(compose)
      expect(result[0].networks).toEqual(['backend', 'frontend'])
    })

    it('returns empty array when no networks', () => {
      const compose = {
        services: { app: { image: 'nginx' } },
      }
      const result = parseServices(compose)
      expect(result[0].networks).toEqual([])
    })
  })

  // Environment extraction
  describe('environment extraction', () => {
    it('extracts dict-form environment', () => {
      const compose = {
        services: {
          app: {
            image: 'nginx',
            environment: { PUID: '1000', TZ: 'UTC' },
          },
        },
      }
      const result = parseServices(compose)
      expect(result[0].environment).toEqual(new Map([['PUID', '1000'], ['TZ', 'UTC']]))
    })

    it('extracts array-form environment', () => {
      const compose = {
        services: {
          app: {
            image: 'nginx',
            environment: ['PUID=1000', 'TZ=UTC'],
          },
        },
      }
      const result = parseServices(compose)
      expect(result[0].environment).toEqual(new Map([['PUID', '1000'], ['TZ', 'UTC']]))
    })

    it('handles array env entries without value', () => {
      const compose = {
        services: {
          app: {
            image: 'nginx',
            environment: ['PUID=1000', 'SOME_VAR'],
          },
        },
      }
      const result = parseServices(compose)
      expect(result[0].environment).toEqual(new Map([['PUID', '1000'], ['SOME_VAR', '']]))
    })

    it('returns empty map when no environment', () => {
      const compose = {
        services: { app: { image: 'nginx' } },
      }
      const result = parseServices(compose)
      expect(result[0].environment).toEqual(new Map())
    })
  })

  // Extras extraction
  describe('extras extraction', () => {
    it('extracts restart policy', () => {
      const compose = {
        services: {
          app: { image: 'nginx', restart: 'unless-stopped' },
        },
      }
      const result = parseServices(compose)
      expect(result[0].extras.get('restart')).toBe('unless-stopped')
    })

    it('extracts hostname and container_name', () => {
      const compose = {
        services: {
          app: {
            image: 'nginx',
            hostname: 'myhost',
            container_name: 'my-container',
          },
        },
      }
      const result = parseServices(compose)
      expect(result[0].extras.get('hostname')).toBe('myhost')
      expect(result[0].extras.get('container_name')).toBe('my-container')
    })

    it('extracts depends_on as comma-separated string', () => {
      const compose = {
        services: {
          app: {
            image: 'nginx',
            depends_on: ['db', 'redis'],
          },
        },
      }
      const result = parseServices(compose)
      expect(result[0].extras.get('depends_on')).toBe('db, redis')
    })

    it('extracts depends_on from dict form', () => {
      const compose = {
        services: {
          app: {
            image: 'nginx',
            depends_on: {
              db: { condition: 'service_healthy' },
              redis: { condition: 'service_started' },
            },
          },
        },
      }
      const result = parseServices(compose)
      expect(result[0].extras.get('depends_on')).toBe('db, redis')
    })

    it('extracts deploy.resources as string', () => {
      const compose = {
        services: {
          app: {
            image: 'nginx',
            deploy: {
              resources: {
                limits: { memory: '512M', cpus: '0.5' },
              },
            },
          },
        },
      }
      const result = parseServices(compose)
      expect(result[0].extras.get('deploy.resources')).toBe('limits: memory=512M, cpus=0.5')
    })

    it('returns empty map when no extras present', () => {
      const compose = {
        services: { app: { image: 'nginx' } },
      }
      const result = parseServices(compose)
      expect(result[0].extras).toEqual(new Map())
    })
  })

  // Immutability
  it('does not mutate the input', () => {
    const compose = {
      services: {
        app: {
          image: 'nginx',
          ports: ['8080:80'],
          environment: { TZ: 'UTC' },
        },
      },
    }
    const copy = JSON.parse(JSON.stringify(compose))
    parseServices(compose)
    expect(compose).toEqual(copy)
  })

  // Multiple services
  it('parses multiple services with mixed formats', () => {
    const compose = {
      services: {
        sonarr: {
          image: 'linuxserver/sonarr:latest',
          ports: ['8989:8989'],
          volumes: ['/config:/config', '/data:/data'],
          environment: { PUID: '1000', TZ: 'UTC' },
          restart: 'unless-stopped',
        },
        radarr: {
          image: 'linuxserver/radarr:latest',
          ports: [{ target: 7878, published: 7878, protocol: 'tcp' }],
          volumes: [{ type: 'bind', source: '/config', target: '/config' }],
          environment: ['PUID=1000', 'TZ=UTC'],
          restart: 'unless-stopped',
          depends_on: ['sonarr'],
        },
      },
    }
    const result = parseServices(compose)
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('radarr')
    expect(result[1].name).toBe('sonarr')
    expect(result[0].ports).toEqual(['7878:7878/tcp'])
    expect(result[1].ports).toEqual(['8989:8989'])
  })
})
