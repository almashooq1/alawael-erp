# W1437 Release Wiki

> **Status:** Ready for production deploy  
> **PR:** #579 | **Hotfix:** W1444  
> **Owner:** Release team  
> **Last updated:** 2026-06-22

---

## Overview

W1437 fixes production DB timeouts in `AdvancedTicket` and `NphiesClaim`, and adds structured diagnostics for LLM anomaly save failures.

| Problem | Root cause | Fix |
|---------|------------|-----|
| P0-1: `advancedtickets.find()` timeout | `$nin` query prevented index usage | `$in: ACTIVE_STATUSES` + compound index |
| P0-2: `nphiesclaims.find()` timeout | `$exists:false` scanned almost all `PENDING_REVIEW` claims | `updatedAt` cutoff + compound index + backfill migration |
| P2-4: LLM anomaly save failed | Cascading DB timeout | Structured logging + timeout fixes |

---

## Deployment Decision Tree

```
Run final review:
└── ./scripts/final-review-w1437.sh

Then choose deploy method:
├── VPS/bare-metal ──► ./scripts/deploy-vps.sh --with-w1437-migration
├── Docker ──► ./scripts/deploy-w1437-docker.sh up
├── Canary ──► ./scripts/deploy-canary-w1437.sh
├── Blue-Green ──► ./scripts/deploy-bluegreen-w1437.sh
└── GitHub Actions ──► Actions → 🗄️ W1437 Production Migration
```

---

## Required Secrets / Variables

### For all methods
- `MONGODB_URI` — production MongoDB connection string

### For GitHub Actions / VPS scripts
- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `DEPLOY_ROOT` (optional, default `/home/alawael/app`)

### Optional
- `SLACK_WEBHOOK` or `TEAMS_WEBHOOK`
- `RUN_W1437_MIGRATION=true` (repo variable) to auto-run migration on every deploy

---

## Pre-Deploy Checklist

- [ ] Latest `main` pulled and gates green
- [ ] MongoDB backup < 24h old
- [ ] `MONGODB_URI` available
- [ ] On-call engineer notified
- [ ] Dry-run executed (optional but recommended)

---

## Deploy Commands

### Dry run
```bash
DRY_RUN=1 NODE_ENV=production node backend/scripts/migrate-nphies-claim-updatedAt.js
```

### VPS one-command
```bash
export MONGODB_URI="..."
./scripts/deploy-vps.sh --with-w1437-migration
./scripts/smoke-test-w1437.sh https://alaweal.org
./scripts/monitor-w1437.sh logs/error1.log
```

### Docker
```bash
export MONGODB_URI="..."
export COMPOSE_FILE="docker-compose.professional.yml:docker-compose.production.yml"
export COMPOSE_PROJECT_NAME=alawael
./scripts/deploy-w1437-docker.sh up
./scripts/smoke-test-w1437.sh https://alaweal.org
./scripts/monitor-w1437-docker.sh alawael-backend-1
```

---

## Post-Deploy Verification

Run smoke tests immediately:

```bash
./scripts/smoke-test-w1437.sh https://alaweal.org
```

Then monitor logs for 30 minutes:

```bash
./scripts/monitor-w1437.sh logs/error1.log
```

Watch for these signatures to stop:

| Signature | Severity |
|-----------|----------|
| `Operation advancedtickets.find() buffering timed out after 10000ms` | P0 |
| `Operation nphiesclaims.find() buffering timed out after 10000ms` | P0 |
| `[llm-anomaly-history] save failed:` | P2 |

---

## Rollback

```bash
export DEPLOY_ROOT=/opt/alawael-erp
./scripts/rollback-w1437.sh [TARGET_COMMIT_OR_TAG]
```

- Default target: commit before W1437 merge
- Migration data is **not** removed (safe to leave)

---

## Artifacts

| Type | Location |
|------|----------|
| Full runbook (Markdown) | `docs/RUNBOOK_W1437.md` |
| Full runbook (PDF) | `docs/RUNBOOK_W1437.pdf` |
| Deployment notes | `docs/DEPLOYMENT_NOTES_W1437.md` |
| Migration script | `backend/scripts/migrate-nphies-claim-updatedAt.js` |
| VPS deploy | `scripts/deploy-w1437.sh`, `scripts/deploy-vps.sh --with-w1437-migration` |
| Docker deploy | `scripts/deploy-w1437-docker.sh` |
| Monitor | `scripts/monitor-w1437.sh`, `scripts/monitor-w1437-docker.sh` |
| Smoke tests | `scripts/smoke-test-w1437.sh` |
| Rollback | `scripts/rollback-w1437.sh` |
| Loki alerts | `ops/loki-rules-w1437.yml` |
| GitHub migration workflow | `.github/workflows/w1437-migrate.yml` |
| GitHub monitor workflow | `.github/workflows/w1437-monitor.yml` |
| GitHub final-review workflow | `.github/workflows/w1437-final-review.yml` |
| GitHub rollback workflow | `.github/workflows/w1437-rollback.yml` |
| Blue-green deploy | `scripts/deploy-bluegreen-w1437.sh` |
| Alert dispatch | `scripts/alert-dispatch.sh` |
| Deployment status | `docs/W1437_DEPLOY_STATUS.md` |

---

## FAQ

**Q: What happens if I forget to run the migration?**  
A: Old `PENDING_REVIEW` NphiesClaims will not be swept by the reconciliation service. The deploy scripts fail fast if the migration is requested.

**Q: Is the migration idempotent?**  
A: Yes. It only updates documents missing `nphies.submission.updatedAt`.

**Q: Can I leave `RUN_W1437_MIGRATION=true` forever?**  
A: Yes, it is safe because the migration is idempotent. You can remove the variable once the release is stable.

**Q: How do I enable Loki alerts?**  
A: Mount `ops/loki-rules-w1437.yml` into the Loki container and ensure Loki's `ruler` points to AlertManager.

**Q: Can I disable W1437 behavior at runtime?**  
A: Yes, set `FEATURE_W1437=false`. The code falls back to pre-W1437 queries.

**Q: How do I page PagerDuty on critical failures?**  
A: Set `PAGERDUTY_INTEGRATION_KEY` when running deploy scripts, or route AlertManager to PagerDuty.

---

## Related Documents

- [Deployment Notes](DEPLOYMENT_NOTES_W1437.md)
- [Problem Ledger](../docs/PROBLEM_LEDGER_v6.md)
