export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function openPrivateBin(): void {
  window.open('https://privatebin.net/', '_blank', 'noopener,noreferrer')
}

export function openGist(): void {
  window.open('https://gist.github.com/', '_blank', 'noopener,noreferrer')
}
