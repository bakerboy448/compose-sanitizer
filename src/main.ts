import { load, dump } from 'js-yaml'
import { isRecord } from './patterns'
import { extractYaml } from './extract'
import { redactCompose } from './redact'
import { stripNoise } from './noise'
import { detectAdvisories, type Advisory } from './advisories'
import { loadConfig, saveConfig, resetConfig, compileConfig, type SanitizerConfig } from './config'
import { copyToClipboard, openPrivateBin, openGist } from './clipboard'
import { createShortNotice, createPiiWarning, createFullDisclaimer } from './disclaimer'
import { el } from './dom'
import { parseServices } from './services'
import { generateMarkdownTable, generateVolumeComparisonMarkdown } from './markdown'
import { renderCards } from './cards'
import { renderServiceTable, renderVolumeTable } from './volume-table'

const MAX_INPUT_BYTES = 512 * 1024

function sanitize(raw: string, config: SanitizerConfig): {
  output: string | null
  parsed: Record<string, unknown> | null
  error: string | null
  stats: { redactedEnvVars: number; redactedEmails: number; anonymizedPaths: number; redactedKeys: readonly string[] }
  advisories: readonly Advisory[]
} {
  const emptyStats = { redactedEnvVars: 0, redactedEmails: 0, anonymizedPaths: 0, redactedKeys: [] as string[] }

  const extracted = extractYaml(raw)
  if (extracted.error !== null || extracted.yaml === null) {
    return { output: null, parsed: null, error: extracted.error, stats: emptyStats, advisories: [] }
  }

  const compiled = compileConfig(config)
  const result = redactCompose(extracted.yaml, compiled)
  if (result.error !== null) {
    return { output: null, parsed: null, error: result.error, stats: emptyStats, advisories: [] }
  }

  let parsed: unknown
  try {
    parsed = load(result.output)
  } catch {
    return { output: result.output, parsed: null, error: null, stats: result.stats, advisories: [] }
  }

  if (isRecord(parsed)) {
    const stripped = stripNoise(parsed)
    const advisories = detectAdvisories(stripped)
    const finalOutput = dump(stripped, { lineWidth: -1, noRefs: true, quotingType: "'", forceQuotes: false })
    return { output: finalOutput, parsed: stripped, error: null, stats: result.stats, advisories }
  }

  return { output: result.output, parsed: null, error: null, stats: result.stats, advisories: [] }
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

function renderStats(stats: { redactedEnvVars: number; redactedEmails: number; anonymizedPaths: number; redactedKeys: readonly string[] }): string {
  const parts: string[] = []
  if (stats.redactedEnvVars > 0) {
    const keyList = stats.redactedKeys.length > 0 ? ` (${[...new Set(stats.redactedKeys)].join(', ')})` : ''
    parts.push(`${stats.redactedEnvVars} env var${stats.redactedEnvVars > 1 ? 's' : ''} redacted${keyList}`)
  }
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
  h1.textContent = 'Docker Compose Debugger'
  header.appendChild(h1)
  const subtitle = el('p')
  subtitle.textContent = 'Paste your Docker Compose output to get a clean, readable breakdown — sensitive values redacted, noise stripped, misconfigurations flagged.'
  subtitle.style.color = 'var(--text-muted)'
  subtitle.style.fontSize = '0.9rem'
  subtitle.style.marginTop = '0.25rem'
  header.appendChild(subtitle)
  app.appendChild(header)

  // Short notice
  app.appendChild(createShortNotice())

  // Help commands (copyable)
  const helpBox = el('div', { className: 'notice' })
  helpBox.style.whiteSpace = 'normal'
  const helpIntro = el('p')
  helpIntro.textContent = 'Run one of these commands, then paste the output below:'
  helpIntro.style.marginBottom = '0.5rem'
  helpIntro.style.fontWeight = '500'
  helpIntro.style.color = 'var(--text)'
  helpBox.appendChild(helpIntro)

  const commands = [
    { label: 'docker-autocompose (recommended)', cmd: 'docker run --rm -v /var/run/docker.sock:/var/run/docker.sock ghcr.io/red5d/docker-autocompose <container_name>' },
    { label: 'docker compose config', cmd: 'docker compose config' },
  ]
  for (const { label, cmd } of commands) {
    const row = el('div')
    row.style.marginBottom = '0.4rem'
    const labelSpan = el('span')
    labelSpan.textContent = label + ':'
    labelSpan.style.fontSize = '0.8rem'
    labelSpan.style.color = 'var(--text-muted)'
    labelSpan.style.display = 'block'
    row.appendChild(labelSpan)

    const cmdWrap = el('div')
    cmdWrap.style.display = 'flex'
    cmdWrap.style.alignItems = 'center'
    cmdWrap.style.gap = '0.5rem'

    const code = el('code')
    code.textContent = cmd
    code.style.fontFamily = 'var(--mono)'
    code.style.fontSize = '0.8rem'
    code.style.background = 'var(--bg)'
    code.style.padding = '0.3rem 0.5rem'
    code.style.borderRadius = '4px'
    code.style.display = 'block'
    code.style.overflowX = 'auto'
    code.style.userSelect = 'all'
    code.style.cursor = 'pointer'
    cmdWrap.appendChild(code)

    const copyBtn = el('button', { className: 'btn btn-secondary' })
    copyBtn.textContent = 'Copy'
    copyBtn.style.padding = '0.2rem 0.5rem'
    copyBtn.style.fontSize = '0.75rem'
    copyBtn.style.flexShrink = '0'
    copyBtn.addEventListener('click', async () => {
      const ok = await copyToClipboard(cmd)
      copyBtn.textContent = ok ? 'Copied!' : 'Failed'
      setTimeout(() => { copyBtn.textContent = 'Copy' }, 1500)
    })
    cmdWrap.appendChild(copyBtn)

    row.appendChild(cmdWrap)
    helpBox.appendChild(row)
  }

  const helpNote = el('p')
  helpNote.textContent = 'You can also paste raw docker-compose.yml content directly.'
  helpNote.style.marginTop = '0.4rem'
  helpNote.style.fontSize = '0.8rem'
  helpNote.style.color = 'var(--text-muted)'
  helpBox.appendChild(helpNote)
  app.appendChild(helpBox)

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

  // Tab bar (hidden until output)
  const tabBar = el('div', { className: 'tab-bar hidden' })
  const yamlTab = el('button', { className: 'tab-btn active' })
  yamlTab.textContent = 'YAML'
  tabBar.appendChild(yamlTab)
  const cardsTab = el('button', { className: 'tab-btn' })
  cardsTab.textContent = 'Cards'
  tabBar.appendChild(cardsTab)
  const volumesTab = el('button', { className: 'tab-btn' })
  volumesTab.textContent = 'Table'
  tabBar.appendChild(volumesTab)
  app.appendChild(tabBar)

  // Output textarea (YAML view)
  const output = el('textarea', {
    id: 'output',
    className: 'code-textarea hidden',
    rows: '18',
    readonly: 'true',
    spellcheck: 'false',
  })
  app.appendChild(output)

  // Cards container (hidden by default)
  const cardsContainer = el('div', { id: 'cards', className: 'cards-container hidden' })
  app.appendChild(cardsContainer)

  // Volumes container (hidden by default)
  const volumesContainer = el('div', { id: 'volumes', className: 'hidden' })
  app.appendChild(volumesContainer)

  // Track current parsed object for markdown generation
  let currentParsed: Record<string, unknown> | null = null

  // Tab switching
  const tabs = [
    { btn: yamlTab, panel: output },
    { btn: cardsTab, panel: cardsContainer },
    { btn: volumesTab, panel: volumesContainer },
  ] as const

  function switchTab(activeBtn: HTMLElement): void {
    for (const tab of tabs) {
      if (tab.btn === activeBtn) {
        tab.btn.classList.add('active')
        tab.panel.classList.remove('hidden')
      } else {
        tab.btn.classList.remove('active')
        tab.panel.classList.add('hidden')
      }
    }
  }

  yamlTab.addEventListener('click', () => switchTab(yamlTab))
  cardsTab.addEventListener('click', () => switchTab(cardsTab))
  volumesTab.addEventListener('click', () => switchTab(volumesTab))

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

  const mdBtn = el('button', { className: 'btn btn-secondary' })
  mdBtn.textContent = 'Copy as Markdown'
  mdBtn.addEventListener('click', async () => {
    if (!currentParsed) {
      mdBtn.textContent = 'No data'
      setTimeout(() => { mdBtn.textContent = 'Copy as Markdown' }, 1500)
      return
    }
    const services = parseServices(currentParsed)
    const parts: string[] = []
    const serviceTable = generateMarkdownTable(services)
    if (serviceTable) {
      parts.push('### Services\n\n' + serviceTable)
    }
    const volTable = generateVolumeComparisonMarkdown(services)
    if (volTable) {
      parts.push('### Volume Comparison\n\n' + volTable)
    }
    const md = parts.join('\n\n')
    const ok = await copyToClipboard(md || 'No services found')
    mdBtn.textContent = ok ? 'Copied!' : 'Copy failed'
    setTimeout(() => { mdBtn.textContent = 'Copy as Markdown' }, 1500)
  })
  actions.appendChild(mdBtn)

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
    const hideOutput = () => {
      output.classList.add('hidden')
      cardsContainer.classList.add('hidden')
      volumesContainer.classList.add('hidden')
      tabBar.classList.add('hidden')
      piiWarning.classList.add('hidden')
      actions.classList.add('hidden')
      statsDiv.classList.add('hidden')
      advisoriesDiv.replaceChildren()
      currentParsed = null
    }

    if (!raw.trim()) {
      errorDiv.textContent = 'Please paste some Docker Compose YAML first.'
      errorDiv.classList.remove('hidden')
      hideOutput()
      return
    }

    if (new Blob([raw]).size > MAX_INPUT_BYTES) {
      errorDiv.textContent = 'Input too large. Maximum 512 KB.'
      errorDiv.classList.remove('hidden')
      hideOutput()
      return
    }

    sanitizeBtn.disabled = true
    sanitizeBtn.textContent = 'Sanitizing...'

    try {
      const result = sanitize(raw, currentConfig)

      if (result.error !== null) {
        errorDiv.textContent = result.error
        errorDiv.classList.remove('hidden')
        hideOutput()
      } else {
        errorDiv.classList.add('hidden')
        output.value = result.output ?? ''
        currentParsed = result.parsed

        // Reset to YAML tab
        switchTab(yamlTab)

        // Render cards + volume table
        cardsContainer.replaceChildren()
        volumesContainer.replaceChildren()
        if (result.parsed) {
          const services = parseServices(result.parsed)
          if (services.length > 0) {
            const cards = renderCards(services)
            // Move children from renderCards container into our persistent container
            while (cards.firstChild) {
              cardsContainer.appendChild(cards.firstChild)
            }
            // Render service overview table
            const svcTable = renderServiceTable(services)
            volumesContainer.appendChild(svcTable)

            // Render volume comparison table
            const volTable = renderVolumeTable(services)
            volumesContainer.appendChild(volTable)

            // Markdown preview textarea
            const svcMd = generateMarkdownTable(services)
            const volMd = generateVolumeComparisonMarkdown(services)
            const mdParts: string[] = []
            if (svcMd) mdParts.push(svcMd)
            if (volMd) mdParts.push(volMd)
            if (mdParts.length > 0) {
              const combinedMd = mdParts.join('\n\n')
              const mdLabel = el('label')
              mdLabel.textContent = 'Markdown (for pasting into Discord / GitHub):'
              mdLabel.style.marginTop = '0.75rem'
              volumesContainer.appendChild(mdLabel)
              const mdPreview = el('textarea', {
                className: 'code-textarea',
                rows: String(Math.min(combinedMd.split('\n').length + 1, 18)),
                readonly: 'true',
                spellcheck: 'false',
              })
              mdPreview.value = combinedMd
              volumesContainer.appendChild(mdPreview)
            }
          }
        }

        tabBar.classList.remove('hidden')
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
