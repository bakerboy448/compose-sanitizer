# Docker Compose Sanitizer

Browser-based tool that redacts sensitive values from Docker Compose YAML while preserving debugging-relevant structure. Paste output from `docker-autocompose`, `docker compose config`, or raw `docker-compose.yml` and get back a version safe to share in support channels.

**Live:** [bakerboy448.github.io/compose-sanitizer](https://bakerboy448.github.io/compose-sanitizer/)

## Features

### Redaction

| What | Example | Result |
|------|---------|--------|
| Sensitive env values | `MYSQL_PASSWORD: supersecret` | `MYSQL_PASSWORD: **REDACTED**` |
| Email addresses | `NOTIFY: user@example.com` | `NOTIFY: **REDACTED**` |
| Home directory paths | `/home/john/media:/tv` | `~/media:/tv` |

Detected patterns: `password`, `secret`, `token`, `api_key`, `auth`, `credential`, `private_key`, `vpn_user`, and more.

Safe-listed keys (kept as-is): `PUID`, `PGID`, `TZ`, `UMASK`, `LOG_LEVEL`, `WEBUI_PORT`, etc.

### Noise Stripping

Removes auto-generated fields that clutter compose output:

- `com.docker.compose.*` labels
- S6-overlay env vars (`S6_*`)
- Default runtime values (`ipc: private`, `entrypoint: /init`)
- Locale/path env vars (`PATH`, `LANG`, `XDG_*`)
- Empty maps and arrays

### Advisories

Detects common misconfigurations and shows warnings with links to documentation:

- **Hardlinks advisory**: Warns when separate `/tv`, `/movies`, etc. mounts prevent hardlinks and instant moves

### Input Handling

Accepts multiple input formats:

- Raw `docker-compose.yml` content
- Output from `docker compose config`
- Output from [`docker-autocompose`](https://github.com/Red5d/docker-autocompose) (strips shell prompts and non-YAML lines)

### Customizable Patterns

The Settings panel allows custom sensitive patterns (regex) and safe key lists. Configuration persists in `localStorage`.

## Self-Hosting

Download `compose-sanitizer.html` from the [latest release](https://github.com/bakerboy448/compose-sanitizer/releases/latest) and open it in any browser. Everything runs client-side in a single HTML file — no server, no network requests, no data leaves your browser.

## Development

```bash
npm install
npm run dev        # Start Vite dev server
npm test           # Run tests (vitest)
npm run build      # Build single-file dist/index.html
```

### Architecture

Single-page app built with Vite + vanilla TypeScript. The build produces one self-contained HTML file via `vite-plugin-singlefile`.

```
src/
  patterns.ts     # Shared type guards, regex patterns, utility functions
  extract.ts      # Extracts YAML from mixed console output
  redact.ts       # Redacts sensitive values, anonymizes paths
  noise.ts        # Strips auto-generated noise fields
  advisories.ts   # Detects misconfigurations (hardlinks, etc.)
  config.ts       # Customizable patterns, localStorage persistence
  clipboard.ts    # Copy, PrivateBin, and Gist sharing
  disclaimer.ts   # PII warnings and legal disclaimers
  main.ts         # UI assembly and event wiring
```

### Testing

104 tests across 7 test files with >93% statement coverage:

```bash
npm test                       # Run tests
npx vitest run --coverage      # Run with coverage report
```

## Privacy

- All processing happens in your browser — no data is sent anywhere
- No analytics, tracking, or external requests
- The "Open PrivateBin" and "Open GitHub Gist" buttons copy to clipboard and open a new tab — you paste manually

## License

MIT
