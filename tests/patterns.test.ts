import { describe, it, expect } from 'vitest'
import { isSensitiveKey, containsEmail, anonymizeHomePath } from '../src/patterns'

describe('isSensitiveKey', () => {
  it.each([
    ['MYSQL_PASSWORD', true],
    ['DB_PASS', true],
    ['API_KEY', true],
    ['AUTH_TOKEN', true],
    ['VPN_USER', true],
    ['SECRET_KEY', true],
    ['PRIVATE_KEY', true],
    ['CREDENTIAL', true],
    ['OAUTH_SECRET', true],
    ['JWT_TOKEN', true],
    ['PW', true],
  ])('returns %s for %s', (key, expected) => {
    expect(isSensitiveKey(key)).toBe(expected)
  })

  it.each([
    ['PUID', false],
    ['PGID', false],
    ['TZ', false],
    ['UMASK', false],
    ['UMASK_SET', false],
    ['WEBUI_PORT', false],
    ['LOG_LEVEL', false],
    ['HOME', false],
    ['PATH', false],
    ['LANG', false],
    ['LC_ALL', false],
  ])('returns %s for safelisted key %s', (key, expected) => {
    expect(isSensitiveKey(key)).toBe(expected)
  })

  it('handles lowercase keys', () => {
    expect(isSensitiveKey('mysql_password')).toBe(true)
    expect(isSensitiveKey('api_key')).toBe(true)
  })

  it('respects custom sensitive patterns', () => {
    const custom = [/^MY_CUSTOM$/i]
    expect(isSensitiveKey('MY_CUSTOM', custom)).toBe(true)
    expect(isSensitiveKey('SOMETHING_ELSE', custom)).toBe(false)
  })

  it('respects custom safe keys', () => {
    const safeKeys = new Set(['AUTH_TOKEN'])
    expect(isSensitiveKey('AUTH_TOKEN', undefined, safeKeys)).toBe(false)
  })
})

describe('containsEmail', () => {
  it('detects standard emails', () => {
    expect(containsEmail('user@example.com')).toBe(true)
    expect(containsEmail('admin@mail.server.org')).toBe(true)
  })

  it('detects emails within longer strings', () => {
    expect(containsEmail('Send to user@example.com please')).toBe(true)
  })

  it('rejects non-emails', () => {
    expect(containsEmail('no-email-here')).toBe(false)
    expect(containsEmail('just-a-string')).toBe(false)
    expect(containsEmail('@')).toBe(false)
  })
})

describe('anonymizeHomePath', () => {
  it('replaces /home/<user>/ with ~/', () => {
    expect(anonymizeHomePath('/home/john/media:/tv')).toBe('~/media:/tv')
  })

  it('leaves ~/ paths unchanged', () => {
    expect(anonymizeHomePath('~/config:/config')).toBe('~/config:/config')
  })

  it('leaves non-home paths unchanged', () => {
    expect(anonymizeHomePath('/mnt/data/media:/tv')).toBe('/mnt/data/media:/tv')
  })

  it('replaces /root/ with ~/', () => {
    expect(anonymizeHomePath('/root/.config:/config')).toBe('~/.config:/config')
  })

  it('handles paths without container mount', () => {
    expect(anonymizeHomePath('/home/user/data')).toBe('~/data')
  })
})
