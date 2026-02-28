export const SHORT_NOTICE =
  'All processing happens locally in your browser. No data is ever sent to any server.\n\n' +
  'This tool is provided as a best-effort aid. Always review the output yourself before sharing \u2014 ' +
  'automated redaction cannot guarantee every sensitive value is caught.'

export const PII_WARNING =
  'Review the output below for any remaining personal information before sharing.'

export const FULL_DISCLAIMER =
  'NO WARRANTY: This software is provided "as is", without warranty of any kind, express or implied, ' +
  'including but not limited to the warranties of merchantability, fitness for a particular purpose, ' +
  'and noninfringement.\n\n' +
  'NO GUARANTEE OF COMPLETE REDACTION: While this tool attempts to identify and redact sensitive ' +
  'values using pattern matching, it cannot guarantee that all sensitive information will be caught. ' +
  'New or unusual patterns, custom variable names, or non-standard formats may not be detected.\n\n' +
  'USER RESPONSIBILITY: You are solely responsible for reviewing the sanitized output before sharing ' +
  'it publicly or with third parties. The authors and contributors of this tool accept no liability ' +
  'for any sensitive information that may remain in the output.\n\n' +
  'NO DATA COLLECTION: All processing is performed entirely within your browser. No data is transmitted ' +
  'to any server, collected, stored, or shared by this tool.\n\n' +
  'NOT LEGAL OR SECURITY ADVICE: This tool does not constitute legal advice, security advice, or a ' +
  'professional security audit. It is a community utility intended to assist with a common task.\n\n' +
  'LIMITATION OF LIABILITY: In no event shall the authors or contributors be liable for any claim, ' +
  'damages, or other liability arising from the use of this tool.\n\n' +
  'This is a community tool built to help, not a contract. Use it as one layer in your review process, ' +
  'not the final word.'

export function createShortNotice(): HTMLElement {
  const div = document.createElement('div')
  div.className = 'notice'
  div.textContent = SHORT_NOTICE
  return div
}

export function createPiiWarning(): HTMLElement {
  const div = document.createElement('div')
  div.className = 'pii-warning'
  div.textContent = PII_WARNING
  return div
}

export function createFullDisclaimer(): HTMLElement {
  const details = document.createElement('details')
  details.className = 'disclaimer'

  const summary = document.createElement('summary')
  summary.textContent = 'Full Disclaimer'
  details.appendChild(summary)

  const content = document.createElement('p')
  content.textContent = FULL_DISCLAIMER
  content.style.whiteSpace = 'pre-wrap'
  details.appendChild(content)

  return details
}
