import { load, dump } from 'js-yaml'
import { isRecord } from './patterns'
import { extractYaml } from './extract'
import { redactCompose } from './redact'
import { stripNoise } from './noise'
import { detectAdvisories, type Advisory } from './advisories'
import { loadConfig, saveConfig, resetConfig, compileConfig, type SanitizerConfig } from './config'
import { copyToClipboard, openPrivateBin, openGist } from './clipboard'
import { createShortNotice, createPiiWarning, createFullDisclaimer } from './disclaimer'

const MAX_INPUT_BYTES = 512 * 1024

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string>,
  children?: (HTMLElement | string)[],
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag)
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'className') {
        element.className = value
      } else {
        element.setAttribute(key, value)
      }
    }
  }
  if (children) {
    for (const child of children) {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child))
      } else {
        element.appendChild(child)
      }
    }
  }
  return element
}

function sanitize(raw: string, config: SanitizerConfig): {
  output: string | null
  error: string | null
  stats: { redactedEnvVars: number; redactedEmails: number; anonymizedPaths: number }
  advisories: readonly Advisory[]
} {
  const emptyStats = { redactedEnvVars: 0, redactedEmails: 0, anonymizedPaths: 0 }

  const extracted = extractYaml(raw)
  if (extracted.error !== null || extracted.yaml === null) {
    return { output: null, error: extracted.error, stats: emptyStats, advisories: [] }
  }

  const compiled = compileConfig(config)
  const result = redactCompose(extracted.yaml, compiled)
  if (result.error !== null) {
    return { output: null, error: result.error, stats: emptyStats, advisories: [] }
  }

  let parsed: unknown
  try {
    parsed = load(result.output)
  } catch {
    return { output: result.output, error: null, stats: result.stats, advisories: [] }
  }

  if (isRecord(parsed)) {
    const stripped = stripNoise(parsed)
    const advisories = detectAdvisories(stripped)
    const finalOutput = dump(stripped, { lineWidth: -1, noRefs: true, quotingType: "'", forceQuotes: false })
    return { output: finalOutput, error: null, stats: result.stats, advisories }
  }

  return { output: result.output, error: null, stats: result.stats, advisories: [] }
}

function renderAdvisories(advisories: readonly Advisory[]): HTMLElement {
  const container = el('div', { className: 'advisories' })
  for (const advisory of advisories) {
    const div = el('div', { className: 'advisory' })

    const icon = el('span', { className: 'advisory-icon' })
    icon.textContent = '\u26A0\uFE0F'
    div.appendChild(icon)

    const text = el('span')
    text.textContent = advisory.message + ' '
    div.appendChild(text)

    const link = el('a', { href: advisory.link, target: '_blank', rel: 'noopener noreferrer' })
    link.textContent = 'Learn more'
    div.appendChild(link)

    const services = el('span', { className: 'advisory-services' })
    services.textContent = ' (Services: ' + advisory.services.join(', ') + ')'
    div.appendChild(services)

    container.appendChild(div)
  }
  return container
}

function renderStats(stats: { redactedEnvVars: number; redactedEmails: number; anonymizedPaths: number }): string {
  const parts: string[] = []
  if (stats.redactedEnvVars > 0) parts.push(`${stats.redactedEnvVars} env var${stats.redactedEnvVars > 1 ? 's' : ''} redacted`)
  if (stats.redactedEmails > 0) parts.push(`${stats.redactedEmails} email${stats.redactedEmails > 1 ? 's' : ''} redacted`)
  if (stats.anonymizedPaths > 0) parts.push(`${stats.anonymizedPaths} path${stats.anonymizedPaths > 1 ? 's' : ''} anonymized`)
  return parts.length > 0 ? parts.join(', ') : 'No sensitive values detected'
}

function buildSettingsPanel(config: SanitizerConfig, onSave: (c: SanitizerConfig) => void): HTMLElement {
  const details = el('details', { className: 'settings' })
  const summary = el('summary')
  summary.textContent = 'Advanced Settings'
  details.appendChild(summary)

  const form = el('div', { className: 'settings-form' })

  const sensLabel = el('label')
  sensLabel.textContent = 'Sensitive patterns (one regex per line):'
  form.appendChild(sensLabel)
  const sensInput = el('textarea', { className: 'settings-textarea', rows: '6', spellcheck: 'false' })
  sensInput.value = config.sensitivePatterns.join('\n')
  form.appendChild(sensInput)

  const safeLabel = el('label')
  safeLabel.textContent = 'Safe keys (one per line):'
  form.appendChild(safeLabel)
  const safeInput = el('textarea', { className: 'settings-textarea', rows: '4', spellcheck: 'false' })
  safeInput.value = config.safeKeys.join('\n')
  form.appendChild(safeInput)

  const btnRow = el('div', { className: 'settings-buttons' })

  const saveBtn = el('button', { className: 'btn btn-secondary' })
  saveBtn.textContent = 'Save Settings'
  saveBtn.addEventListener('click', () => {
    const newConfig: SanitizerConfig = {
      sensitivePatterns: sensInput.value.split('\n').map(s => s.trim()).filter(Boolean),
      safeKeys: safeInput.value.split('\n').map(s => s.trim()).filter(Boolean),
    }
    onSave(newConfig)
    saveConfig(newConfig)
    saveBtn.textContent = 'Saved!'
    setTimeout(() => { saveBtn.textContent = 'Save Settings' }, 1500)
  })
  btnRow.appendChild(saveBtn)

  const resetBtn = el('button', { className: 'btn btn-secondary' })
  resetBtn.textContent = 'Reset to Defaults'
  resetBtn.addEventListener('click', () => {
    const defaults = resetConfig()
    sensInput.value = defaults.sensitivePatterns.join('\n')
    safeInput.value = defaults.safeKeys.join('\n')
    onSave(defaults)
  })
  btnRow.appendChild(resetBtn)

  form.appendChild(btnRow)
  details.appendChild(form)
  return details
}

function init(): void {
  const app = document.getElementById('app')
  if (!app) return

  let currentConfig = loadConfig()

  // Header
  const header = el('header')
  const h1 = el('h1')
  h1.textContent = 'Docker Compose Sanitizer'
  header.appendChild(h1)
  app.appendChild(header)

  // Short notice
  app.appendChild(createShortNotice())

  // Input
  const inputLabel = el('label', { for: 'input' })
  inputLabel.textContent = 'Paste your Docker Compose YAML or console output:'
  app.appendChild(inputLabel)
  const input = el('textarea', {
    id: 'input',
    className: 'code-textarea',
    rows: '18',
    spellcheck: 'false',
  })
  input.placeholder = 'Paste output from:\n  docker run --rm -v /var/run/docker.sock:/var/run/docker.sock ghcr.io/red5d/docker-autocompose <container>\n  docker compose config\n  or raw docker-compose.yml content'
  app.appendChild(input)

  // Sanitize button
  const sanitizeBtn = el('button', { id: 'sanitize', className: 'btn btn-primary' })
  sanitizeBtn.textContent = 'Sanitize'
  app.appendChild(sanitizeBtn)

  // Error display
  const errorDiv = el('div', { id: 'error', className: 'error hidden' })
  app.appendChild(errorDiv)

  // Stats display
  const statsDiv = el('div', { id: 'stats', className: 'stats hidden' })
  app.appendChild(statsDiv)

  // Advisories container
  const advisoriesDiv = el('div', { id: 'advisories' })
  app.appendChild(advisoriesDiv)

  // PII warning (hidden until output)
  const piiWarning = createPiiWarning()
  piiWarning.classList.add('hidden')
  app.appendChild(piiWarning)

  // Output
  const output = el('textarea', {
    id: 'output',
    className: 'code-textarea hidden',
    rows: '18',
    readonly: 'true',
    spellcheck: 'false',
  })
  app.appendChild(output)

  // Action buttons
  const actions = el('div', { id: 'actions', className: 'actions hidden' })

  const copyBtn = el('button', { className: 'btn btn-secondary' })
  copyBtn.textContent = 'Copy to Clipboard'
  copyBtn.addEventListener('click', async () => {
    const ok = await copyToClipboard(output.value)
    copyBtn.textContent = ok ? 'Copied!' : 'Copy failed'
    setTimeout(() => { copyBtn.textContent = 'Copy to Clipboard' }, 1500)
  })
  actions.appendChild(copyBtn)

  const pbBtn = el('button', { className: 'btn btn-secondary' })
  pbBtn.textContent = 'Open PrivateBin'
  pbBtn.addEventListener('click', async () => {
    await copyToClipboard(output.value)
    openPrivateBin()
  })
  actions.appendChild(pbBtn)

  const gistBtn = el('button', { className: 'btn btn-secondary' })
  gistBtn.textContent = 'Open GitHub Gist'
  gistBtn.addEventListener('click', async () => {
    await copyToClipboard(output.value)
    openGist()
  })
  actions.appendChild(gistBtn)

  app.appendChild(actions)

  // Settings panel
  const settings = buildSettingsPanel(currentConfig, (c) => { currentConfig = c })
  app.appendChild(settings)

  // Full disclaimer
  app.appendChild(createFullDisclaimer())

  // Source code link
  const footer = el('div', { className: 'footer' })
  const sourceLink = el('a', {
    href: 'https://github.com/bakerboy448/compose-sanitizer',
    target: '_blank',
    rel: 'noopener noreferrer',
  })
  sourceLink.textContent = 'Source code on GitHub'
  footer.appendChild(sourceLink)
  app.appendChild(footer)

  // Sanitize handler
  sanitizeBtn.addEventListener('click', () => {
    const raw = input.value
    if (!raw.trim()) {
      errorDiv.textContent = 'Please paste some Docker Compose YAML first.'
      errorDiv.classList.remove('hidden')
      output.classList.add('hidden')
      piiWarning.classList.add('hidden')
      actions.classList.add('hidden')
      statsDiv.classList.add('hidden')
      advisoriesDiv.replaceChildren()
      return
    }

    if (new Blob([raw]).size > MAX_INPUT_BYTES) {
      errorDiv.textContent = 'Input too large. Maximum 512 KB.'
      errorDiv.classList.remove('hidden')
      output.classList.add('hidden')
      piiWarning.classList.add('hidden')
      actions.classList.add('hidden')
      statsDiv.classList.add('hidden')
      advisoriesDiv.replaceChildren()
      return
    }

    sanitizeBtn.disabled = true
    sanitizeBtn.textContent = 'Sanitizing...'

    try {
      const result = sanitize(raw, currentConfig)

      if (result.error !== null) {
        errorDiv.textContent = result.error
        errorDiv.classList.remove('hidden')
        output.classList.add('hidden')
        piiWarning.classList.add('hidden')
        actions.classList.add('hidden')
        statsDiv.classList.add('hidden')
        advisoriesDiv.replaceChildren()
      } else {
        errorDiv.classList.add('hidden')
        output.value = result.output ?? ''
        output.classList.remove('hidden')
        piiWarning.classList.remove('hidden')
        actions.classList.remove('hidden')
        statsDiv.textContent = renderStats(result.stats)
        statsDiv.classList.remove('hidden')

        advisoriesDiv.replaceChildren()
        if (result.advisories.length > 0) {
          advisoriesDiv.appendChild(renderAdvisories(result.advisories))
        }
      }
    } finally {
      sanitizeBtn.disabled = false
      sanitizeBtn.textContent = 'Sanitize'
    }
  })
}

init()
