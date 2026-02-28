import { describe, it, expect, beforeEach } from 'vitest'
import { loadConfig, saveConfig, resetConfig, DEFAULT_CONFIG } from '../src/config'

describe('config', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('loadConfig returns defaults with empty localStorage', () => {
    const config = loadConfig()
    expect(config.sensitivePatterns).toEqual(DEFAULT_CONFIG.sensitivePatterns)
    expect(config.safeKeys).toEqual(DEFAULT_CONFIG.safeKeys)
  })

  it('saveConfig persists to localStorage', () => {
    const custom = {
      sensitivePatterns: ['custom_pattern'],
      safeKeys: ['CUSTOM_SAFE'],
    }
    saveConfig(custom)
    const stored = localStorage.getItem('compose-sanitizer-config')
    expect(stored).toBeTruthy()
    expect(JSON.parse(stored!)).toEqual(custom)
  })

  it('loadConfig returns saved patterns after save', () => {
    const custom = {
      sensitivePatterns: ['my_secret'],
      safeKeys: ['MY_SAFE_KEY'],
    }
    saveConfig(custom)
    const loaded = loadConfig()
    expect(loaded.sensitivePatterns).toEqual(['my_secret'])
    expect(loaded.safeKeys).toEqual(['MY_SAFE_KEY'])
  })

  it('loadConfig falls back to defaults on invalid JSON', () => {
    localStorage.setItem('compose-sanitizer-config', 'not valid json!!!')
    const config = loadConfig()
    expect(config.sensitivePatterns).toEqual(DEFAULT_CONFIG.sensitivePatterns)
    expect(config.safeKeys).toEqual(DEFAULT_CONFIG.safeKeys)
  })

  it('loadConfig falls back to defaults on missing fields', () => {
    localStorage.setItem('compose-sanitizer-config', '{"sensitivePatterns": ["foo"]}')
    const config = loadConfig()
    expect(config.sensitivePatterns).toEqual(['foo'])
    expect(config.safeKeys).toEqual(DEFAULT_CONFIG.safeKeys)
  })

  it('resetConfig clears localStorage and returns defaults', () => {
    saveConfig({ sensitivePatterns: ['custom'], safeKeys: ['CUSTOM'] })
    const config = resetConfig()
    expect(config.sensitivePatterns).toEqual(DEFAULT_CONFIG.sensitivePatterns)
    expect(config.safeKeys).toEqual(DEFAULT_CONFIG.safeKeys)
    expect(localStorage.getItem('compose-sanitizer-config')).toBeNull()
  })

  it('DEFAULT_CONFIG has expected sensitive patterns', () => {
    expect(DEFAULT_CONFIG.sensitivePatterns.length).toBeGreaterThan(0)
    expect(DEFAULT_CONFIG.sensitivePatterns).toContain('passw(or)?d')
    expect(DEFAULT_CONFIG.sensitivePatterns).toContain('secret')
    expect(DEFAULT_CONFIG.sensitivePatterns).toContain('token')
  })

  it('DEFAULT_CONFIG has expected safe keys', () => {
    expect(DEFAULT_CONFIG.safeKeys).toContain('PUID')
    expect(DEFAULT_CONFIG.safeKeys).toContain('PGID')
    expect(DEFAULT_CONFIG.safeKeys).toContain('TZ')
  })
})
