# Scripts Directory Guide

This folder contains repository-level automation and maintenance helpers.

## Common groups

### Deployment

- `deploy-hostinger.js` — Hostinger deployment helper
- `deploy-vps.sh` — VPS deployment script
- `prepare-deploy.js` — deployment preparation

### Fix/repair utilities

- `fix-corrupted-calls.js`
- `fix-duplicate-imports.js`
- `fix-misplaced-imports.js`
- `fix-text-index-language.js`
- `fix-truncated-calls.js`
- `migrate-date-calls.js`

### Validation

- `validate-env.js` — environment validation helper

### Workflow helpers

- `agent-worktree.sh` — worktree helper for agent workflows
- `uptime-watchdog.sh` — uptime watchdog helper

## Notes

- Prefer keeping new repo-wide automation here if it is not backend-specific.
- Backend-only checks should stay under `backend/scripts/`.
