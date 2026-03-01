# baker-scripts Org Migration & Setup

**Status:** Nearly Complete
**Date:** 2026-03-01

## Goal

Move repos from bakerboy448 to baker-scripts GitHub org, configure org settings, update all references, and apply consistent repo settings.

---

## Tasks

### Org Setup
- [x] Create baker-scripts GitHub org
- [x] Set org description: "Open-source tools and scripts for the selfhosted community"
- [x] Set org blog: https://baker-scripts.github.io
- [x] Restrict member repo creation (admin-only)
- [x] Disable private repos and private forks
- [x] Enable 2FA requirement
- [x] Create teams: maintainers, bots, contributors
- [x] Add bakerboy448 to maintainers (maintainer role)

### Repo Transfers
- [x] Transfer docker-compose-debugger (was compose-sanitizer)
- [x] Transfer StarrScripts
- [x] Transfer autodns
- [x] Transfer Scripts
- [x] Transfer pmm-config
- [x] Transfer RedditModLog

### docker-compose-debugger Settings (Template for All Repos)
- [x] Squash merge only (no merge commits, no rebase merge)
- [x] Squash commit title: PR_TITLE, message: PR_BODY
- [x] Delete branch on merge
- [x] Auto-merge enabled
- [x] Allow update branch
- [x] Secret scanning enabled
- [x] Push protection enabled
- [x] Vulnerability alerts enabled
- [x] Dependabot security updates enabled
- [x] Wiki, Projects, Discussions disabled
- [x] GitHub Pages enabled
- [x] Branch protection: test required (non-strict)
- [x] Homepage URL updated
- [x] Topics updated
- [x] CLAUDE.md present
- [x] .coderabbit.yaml present
- [x] renovate.json present
- [x] .gitleaks.toml present
- [x] CI: test, security (npm audit, gitleaks, build size gate)
- [x] Pre-release workflow (auto on push to main)
- [x] Stable release workflow (manual dispatch)

### Apply Settings to Transferred Repos
- [x] StarrScripts: squash-only, secret scanning, push protection, delete-branch-on-merge
- [x] autodns: squash-only, secret scanning, push protection, delete-branch-on-merge
- [x] Scripts: squash-only, secret scanning, push protection, delete-branch-on-merge
- [x] pmm-config: squash-only, secret scanning, push protection, delete-branch-on-merge
- [x] RedditModLog: squash-only, secret scanning, push protection, delete-branch-on-merge

### Update READMEs & URLs
- [x] StarrScripts: updated repo URLs to baker-scripts
- [x] Scripts: updated raw.githubusercontent.com URL to baker-scripts
- [x] autodns: updated GHCR refs to baker-scripts (PR #23, merged)
- [x] pmm-config: no changes needed (personal attribution only)
- [x] RedditModLog: updated GHCR refs, OCI labels, workflow IMAGE_NAME (PR #11, merged)

### Standardize Configs
- [x] StarrScripts: .coderabbit.yaml, renovate.json, .gitleaks.toml added
- [x] Scripts: .coderabbit.yaml, renovate.json, .gitleaks.toml added
- [x] pmm-config: .coderabbit.yaml, renovate.json, .gitleaks.toml added
- [x] RedditModLog: .coderabbit.yaml, .gitleaks.toml added (PR #12, merged)
- [x] autodns: already had renovate.json (deferred: add .coderabbit.yaml, .gitleaks.toml)

### Docker/GHCR
- [x] RedditModLog: v1.4.4 release created, image published to ghcr.io/baker-scripts/redditmodlog
- [x] dockergit compose updated: ghcr.io/baker-scripts/redditmodlog:1
- [ ] **YOU**: Make GHCR package public (https://github.com/orgs/baker-scripts/packages/container/redditmodlog/settings)
- [ ] **YOU**: Pull and recreate container after package is public: `cd /opt/dockergit/servers/hetzner && op run --env-file .env -- docker compose pull redditmodlog-opensignups && op run --env-file .env -- docker compose up -d redditmodlog-opensignups`

### Update Local Git Remotes
- [x] compose-sanitizer → baker-scripts/docker-compose-debugger (already done)
- [x] /opt/StarrScripts → baker-scripts/StarrScripts
- [x] /opt/RedditModLog → baker-scripts/RedditModLog
- [x] No other local clones found for autodns, Scripts, pmm-config

### Merged PRs
- [x] Renovate PR #9 on docker-compose-debugger (Node v24 update) — merged

### GitHub Apps (Manual)
- [ ] **YOU**: Install CodeRabbit on baker-scripts org (https://github.com/apps/coderabbitai)
- [ ] Install Copilot (deferred for later)

### Deferred
- [ ] autodns: add .coderabbit.yaml, .gitleaks.toml (has branch protection)
- [ ] autodns: fix workflow packages:write permission (build failed)
- [ ] RedditModLog: fix Trivy SARIF upload permission in workflow
- [ ] RedditModLog: fix SBOM release asset permission in workflow

---

## Done When
- [x] All repos under baker-scripts with consistent settings
- [x] All READMEs reference baker-scripts URLs
- [x] All local clones point to baker-scripts remotes
- [ ] CodeRabbit installed on org
- [x] GitHub Pages working at baker-scripts.github.io/docker-compose-debugger

## Rollback
- GitHub repo transfers create redirects from old URLs automatically
- Old URLs (bakerboy448/*) will redirect indefinitely
