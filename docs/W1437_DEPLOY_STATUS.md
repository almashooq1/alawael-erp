# W1437 Deployment Status

> Auto-generated status page. Run `node scripts/track-deploy-status.js` to update.

## Current State

| Metric | Value |
|--------|-------|
| Branch | `main` |
| Commit | `fe036d1b5` |
| Generated at | 2026-06-22T11:29:42.614Z |
| Working tree | ❌ dirty |
| Release | W1437 (feat/w1406-preflight-followup) |
| Hotfix | W1444 |

## Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| Migration script | `backend/scripts/migrate-nphies-claim-updatedAt.js` | ✅ present |
| Local migration test | `backend/scripts/test-migration-local.js` | ✅ present |
| Chaos/regression test | `backend/scripts/chaos-test-w1437.js` | ✅ present |
| VPS deploy executor | `scripts/deploy-w1437.sh` | ✅ present |
| VPS deploy integration | `scripts/deploy-vps.sh` | ✅ present |
| Canary deploy | `scripts/deploy-canary-w1437.sh` | ✅ present |
| Docker deploy | `scripts/deploy-w1437-docker.sh` | ✅ present |
| Docker monitor | `scripts/monitor-w1437-docker.sh` | ✅ present |
| Rollback script | `scripts/rollback-w1437.sh` | ✅ present |
| Smoke tests | `scripts/smoke-test-w1437.sh` | ✅ present |
| VPS monitor | `scripts/monitor-w1437.sh` | ✅ present |
| Final review | `scripts/final-review-w1437.sh` | ✅ present |
| Loki alerts | `ops/loki-rules-w1437.yml` | ✅ present |
| GitHub migration workflow | `.github/workflows/w1437-migrate.yml` | ✅ present |
| GitHub monitor workflow | `.github/workflows/w1437-monitor.yml` | ✅ present |
| GitHub final-review workflow | `.github/workflows/w1437-final-review.yml` | ✅ present |
| GitHub rollback workflow | `.github/workflows/w1437-rollback.yml` | ✅ present |
| Blue-green deploy | `scripts/deploy-bluegreen-w1437.sh` | ✅ present |
| Alert dispatch | `scripts/alert-dispatch.sh` | ✅ present |
| Runbook PDF | `docs/RUNBOOK_W1437.pdf` | ✅ present |
| Runbook Markdown | `docs/RUNBOOK_W1437.md` | ✅ present |
| Wiki page | `docs/WIKI_W1437.md` | ✅ present |
| Cheat sheet | `docs/W1437_DEPLOY_CHEAT_SHEET.md` | ✅ present |
| Deployment notes | `docs/DEPLOYMENT_NOTES_W1437.md` | ✅ present |


## Validation Checks

| Check | Command | Status |
|-------|---------|--------|
| Shell syntax | `bash -n scripts/deploy-w1437.sh scripts/monitor-w1437.sh scripts/rollback-w1437.sh scripts/smoke-test-w1437.sh scripts/deploy-vps.sh scripts/final-review-w1437.sh scripts/deploy-canary-w1437.sh` | ✅ |
| Migration script syntax | `node -c backend/scripts/migrate-nphies-claim-updatedAt.js` | ✅ |
| Local migration test syntax | `node -c backend/scripts/test-migration-local.js` | ✅ |


## Deployment Readiness

Run locally:

```bash
./scripts/final-review-w1437.sh
```

If all checks pass, the repository is ready for production deployment.

## Next Steps

1. Run final review locally: `./scripts/final-review-w1437.sh`
2. Execute deployment method from `docs/W1437_DEPLOY_CHEAT_SHEET.md`
3. Run smoke tests and monitor
4. Sign off in `docs/RUNBOOK_W1437.md`

## History

| Date | Commit | Event |
|------|--------|-------|
| 2026-06-22T11:29:42.614Z | fe036d1b5 | Status page generated |
