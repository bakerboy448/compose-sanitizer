import { describe, it, expect } from 'vitest'
import { redactCompose } from '../src/redact'

describe('redactCompose', () => {
  it('redacts sensitive env vars in dict style', () => {
    const input = `
services:
  app:
    image: linuxserver/sonarr
    environment:
      MYSQL_PASSWORD: supersecret
      PUID: "1000"
      PGID: "1000"
      TZ: America/New_York
`
    const result = redactCompose(input)
    expect(result.error).toBeNull()
    expect(result.output).toContain('MYSQL_PASSWORD')
    expect(result.output).toContain('**REDACTED**')
    expect(result.output).not.toContain('supersecret')
    expect(result.output).toContain("'1000'")
    expect(result.output).toContain('America/New_York')
  })

  it('redacts sensitive env vars in array style', () => {
    const input = `
services:
  app:
    image: linuxserver/sonarr
    environment:
      - 'MYSQL_PASSWORD=supersecret'
      - 'PUID=1000'
      - 'TZ=America/New_York'
`
    const result = redactCompose(input)
    expect(result.error).toBeNull()
    expect(result.output).toContain('MYSQL_PASSWORD=**REDACTED**')
    expect(result.output).not.toContain('supersecret')
    expect(result.output).toContain('PUID=1000')
    expect(result.output).toContain('TZ=America/New_York')
  })

  it('redacts emails in env values', () => {
    const input = `
services:
  app:
    environment:
      NOTIFY_EMAIL: user@example.com
      PUID: "1000"
`
    const result = redactCompose(input)
    expect(result.error).toBeNull()
    expect(result.output).not.toContain('user@example.com')
    expect(result.output).toContain('**REDACTED**')
  })

  it('anonymizes home paths in volumes', () => {
    const input = `
services:
  app:
    volumes:
      - /home/john/media:/tv
      - /mnt/data/media:/movies
      - /root/.config:/config
`
    const result = redactCompose(input)
    expect(result.error).toBeNull()
    expect(result.output).toContain('~/media:/tv')
    expect(result.output).toContain('/mnt/data/media:/movies')
    expect(result.output).toContain('~/.config:/config')
    expect(result.output).not.toContain('/home/john')
    expect(result.output).not.toContain('/root/')
  })

  it('keeps container names, labels, networks, ports', () => {
    const input = `
services:
  app:
    container_name: sonarr
    image: linuxserver/sonarr
    labels:
      - "traefik.enable=true"
    networks:
      - proxy
    ports:
      - "8989:8989"
`
    const result = redactCompose(input)
    expect(result.error).toBeNull()
    expect(result.output).toContain('sonarr')
    expect(result.output).toContain('linuxserver/sonarr')
    expect(result.output).toContain('traefik.enable=true')
    expect(result.output).toContain('proxy')
    expect(result.output).toContain('8989:8989')
  })

  it('handles multiple services', () => {
    const input = `
services:
  sonarr:
    image: linuxserver/sonarr
    environment:
      API_KEY: abc123
  radarr:
    image: linuxserver/radarr
    environment:
      API_KEY: def456
`
    const result = redactCompose(input)
    expect(result.error).toBeNull()
    expect(result.output).not.toContain('abc123')
    expect(result.output).not.toContain('def456')
    expect(result.stats.redactedEnvVars).toBe(2)
  })

  it('handles empty/minimal compose input', () => {
    const result = redactCompose('services: {}')
    expect(result.error).toBeNull()
    expect(result.output).toBeTruthy()
  })

  it('returns error for invalid YAML', () => {
    const result = redactCompose('this is: not: valid: yaml: [')
    expect(result.error).toBeTruthy()
  })

  it('returns error for non-object YAML', () => {
    const result = redactCompose('just a string')
    expect(result.error).toBeTruthy()
  })

  it('tracks redaction stats', () => {
    const input = `
services:
  app:
    environment:
      SECRET: value1
      TOKEN: value2
      EMAIL_FIELD: user@example.com
    volumes:
      - /home/user/config:/config
`
    const result = redactCompose(input)
    expect(result.stats.redactedEnvVars).toBe(2)
    expect(result.stats.redactedEmails).toBe(1)
    expect(result.stats.anonymizedPaths).toBe(1)
  })

  it('handles env vars without values in dict style', () => {
    const input = `
services:
  app:
    environment:
      SECRET:
      PUID: "1000"
`
    const result = redactCompose(input)
    expect(result.error).toBeNull()
    expect(result.output).toContain('PUID')
  })

  it('redacts emails in array-style env values', () => {
    const input = `
services:
  app:
    environment:
      - 'NOTIFY=user@example.com'
`
    const result = redactCompose(input)
    expect(result.error).toBeNull()
    expect(result.output).not.toContain('user@example.com')
  })
})
