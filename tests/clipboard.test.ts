import { describe, it, expect, vi, beforeEach } from 'vitest'
import { copyToClipboard, openPrivateBin, openGist } from '../src/clipboard'

describe('copyToClipboard', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('calls navigator.clipboard.writeText with the text', async () => {
    await copyToClipboard('test text')
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test text')
  })

  it('returns true on success', async () => {
    const result = await copyToClipboard('test')
    expect(result).toBe(true)
  })

  it('returns false on failure', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('denied')),
      },
    })
    const result = await copyToClipboard('test')
    expect(result).toBe(false)
  })
})

describe('openPrivateBin', () => {
  it('opens PrivateBin in a new tab', () => {
    const spy = vi.spyOn(window, 'open').mockImplementation(() => null)
    openPrivateBin()
    expect(spy).toHaveBeenCalledWith(
      'https://privatebin.net/',
      '_blank',
      'noopener,noreferrer',
    )
    spy.mockRestore()
  })
})

describe('openGist', () => {
  it('opens GitHub Gist in a new tab', () => {
    const spy = vi.spyOn(window, 'open').mockImplementation(() => null)
    openGist()
    expect(spy).toHaveBeenCalledWith(
      'https://gist.github.com/',
      '_blank',
      'noopener,noreferrer',
    )
    spy.mockRestore()
  })
})
