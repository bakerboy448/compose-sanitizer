# Docker Compose Sanitizer

Browser-based tool that redacts sensitive values from Docker Compose YAML while preserving debugging-relevant structure. Paste output from `docker-autocompose`, `docker compose config`, or raw `docker-compose.yml` and get back a version safe to share in support channels.

**Live:** [bakerboy448.github.io/compose-sanitizer](https://bakerboy448.github.io/compose-sanitizer/)

## What Gets Redacted

- **Sensitive env var values** matching password, secret, token, api_key, auth, credential patterns
- **Email addresses** detected in any value
- **Home directory paths** in volume mounts (`/home/user/...` becomes `~/...`)

## What Gets Kept

- Container names, images, labels, networks, ports
- Volume mounts (with anonymized home paths)
- Environment variable **names** (only values redacted)
- PUID, PGID, TZ, UMASK values (explicitly safelisted)

## Self-Hosting

Download `compose-sanitizer.html` from the [latest release](https://github.com/bakerboy448/compose-sanitizer/releases) and open it in any browser. Everything runs client-side — no server required.

## Development

```bash
npm install
npm run dev      # Start dev server
npm run test     # Run tests
npm run build    # Build single-file output
```

## License

MIT
