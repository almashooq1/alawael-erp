# W1437 Production Deployment Runbook

> **Release:** W1437 (feat/w1406-preflight-followup)  
> **PR:** [#579](https://github.com/almashooq1/alawael-erp/pull/579)  
> **Hotfix:** W1444 migration native-driver fix  
> **Last updated:** 2026-06-22  
> **Owner:** Release team / DevOps / on-call engineer

---

## 1. Purpose

This runbook describes the end-to-end procedure for deploying the W1437 release to production. W1437 fixes critical production DB timeouts and adds structured LLM anomaly diagnostics.

**Mandatory pre-deploy step:** run the `NphiesClaim` `updatedAt` backfill migration **before** deploying the new application code. Old `PENDING_REVIEW` claims will not be swept without it.

---

## 2. Prerequisites

Before starting, ensure:

- [ ] PR #579 is merged to `main`.
- [ ] Local `main` is up to date with `origin/main`.
- [ ] Pre-push gates pass on `main`.
- [ ] You have production SSH access (for VPS methods).
- [ ] `MONGODB_URI` for the production cluster is available.
- [ ] A MongoDB backup exists from the last 24 hours.
- [ ] On-call engineer is notified.
- [ ] Rollback plan is understood.

---

## 3. Quick Reference

| Artifact | Path |
|----------|------|
| Migration script | `backend/scripts/migrate-nphies-claim-updatedAt.js` |
| VPS deploy executor | `scripts/deploy-w1437.sh` |
| VPS deploy integration | `scripts/deploy-vps.sh --with-w1437-migration` |
| Docker deploy | `scripts/deploy-w1437-docker.sh` |
| Rollback script | `scripts/rollback-w1437.sh` |
| Smoke tests | `scripts/smoke-test-w1437.sh` |
| VPS monitor | `scripts/monitor-w1437.sh` |
| Docker monitor | `scripts/monitor-w1437-docker.sh` |
| Loki alerts | `ops/loki-rules-w1437.yml` |
| GitHub migration workflow | `.github/workflows/w1437-migrate.yml` |
| GitHub monitor workflow | `.github/workflows/w1437-monitor.yml` |
| Deployment notes | `docs/DEPLOYMENT_NOTES_W1437.md` |

---

## 4. Deployment Methods

Choose **one** method.

### 4.1 VPS / Bare-Metal (Recommended)

SSH to the production host and run:

```bash
cd /home/alawael/app          # or your DEPLOY_ROOT
export MONGODB_URI="mongodb+srv://..."
export NODE_ENV=production
./scripts/deploy-w1437.sh --force
```

The script will:
1. Verify backup age and MongoDB connectivity.
2. Pull latest `main`.
3. Run the migration.
4. Verify compound indexes.

Then deploy backend + frontend as usual and run smoke tests:

```bash
./scripts/smoke-test-w1437.sh https://alaweal.org
```

Or with automatic rollback if smoke tests fail:

```bash
./scripts/smoke-test-w1437.sh --auto-rollback https://alaweal.org
```

Finally, start the 30-minute monitor:

```bash
./scripts/monitor-w1437.sh logs/error1.log
```

### 4.2 One-Command VPS Deploy

If you use the existing `deploy-vps.sh` script:

```bash
export MONGODB_URI="mongodb+srv://..."
./scripts/deploy-vps.sh --with-w1437-migration
./scripts/smoke-test-w1437.sh https://alaweal.org
./scripts/monitor-w1437.sh logs/error1.log
```

### 4.3 Docker Compose

```bash
export MONGODB_URI="mongodb+srv://..."
export COMPOSE_FILE="docker-compose.professional.yml:docker-compose.production.yml"
export COMPOSE_PROJECT_NAME=alawael
./scripts/deploy-w1437-docker.sh up
./scripts/smoke-test-w1437.sh https://alaweal.org
./scripts/monitor-w1437-docker.sh alawael-backend-1
```

### 4.4 GitHub Actions

1. Go to **Actions → 🗄️ W1437 Production Migration → Run workflow**.
2. Type `migrate` in the confirm field.
3. Check **"نشر التطبيق بعد الميجرشن؟"** to also deploy.
4. After deploy, run **Actions → 👁️ W1437 Post-Deploy Monitor**.

Required secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `MONGODB_URI`.

---

## 5. Dry Run

Estimate impact without writing anything:

```bash
DRY_RUN=1 NODE_ENV=production node backend/scripts/migrate-nphies-claim-updatedAt.js
```

Expected output:

```json
[migrate-nphies-claim-updatedAt] dry-run { wouldMatch: 1234, wouldModify: 1234 }
```

---

## 6. Post-Deploy Monitoring

Watch `error1.log` (or container logs) for **30 minutes**. These signatures should **stop** after deploy:

| Signature | Severity | Ticket |
|-----------|----------|--------|
| `Operation advancedtickets.find() buffering timed out after 10000ms` | P0 | P0-1 |
| `Operation nphiesclaims.find() buffering timed out after 10000ms` | P0 | P0-2 |
| `[llm-anomaly-history] save failed:` | P2 | P2-4 |

Also verify:

- [ ] NPHIES reconciliation sweeper transitions old `PENDING_REVIEW` claims.
- [ ] SLA scheduler (`checkResolutionBreaches`, `assignMissingSlaDeadlines`, `getSlaStats`) completes without timeout errors.

---

## 7. Rollback

If the release causes problems, run:

```bash
export DEPLOY_ROOT=/opt/alawael-erp
./scripts/rollback-w1437.sh
```

The script:
- Backs up the current `backend/` and `frontend/` directories.
- Resets the application code to the commit before W1437.
- Restarts services.
- **Does not** remove migration data (`nphies.submission.updatedAt`); old code ignores it safely.

To roll back to a specific commit or tag:

```bash
./scripts/rollback-w1437.sh v1.2.3
```

---

## 8. Alerts

### 8.1 Loki Log Alerts

Mount `ops/loki-rules-w1437.yml` into the Loki container:

```yaml
volumes:
  - ./ops/loki-rules-w1437.yml:/loki/rules/fake/w1437.yml:ro
```

Alerts route to AlertManager at `http://alertmanager:9093`.

### 8.2 Notification Webhooks

The deploy scripts can notify Slack or Teams:

```bash
export SLACK_WEBHOOK="https://hooks.slack.com/services/..."
# or
export TEAMS_WEBHOOK="https://outlook.office.com/webhook/..."
./scripts/deploy-w1437.sh
```

---

## 9. Known Risks

| Risk | Mitigation |
|------|------------|
| Migration not run before deploy | `deploy-w1437.sh` fails fast; GitHub Actions workflow enforces order; `--with-w1437-migration` flag in `deploy-vps.sh`. |
| Indexes missing | Scripts verify indexes; Mongoose `autoIndex` builds them on startup if enabled. |
| Local changes lost on production host | `--force` flag required; script aborts on dirty working tree by default. |
| Rollback needed | `rollback-w1437.sh` automates code rollback and backup. |
| Long-running monitor forgotten | GitHub Actions workflow runs the full 30-minute monitor and reports result. |

---

## 10. Sign-off

| Role | Name | Sign-off | Date |
|------|------|----------|------|
| Release owner | | | |
| DevOps / DBA | | | |
| On-call engineer | | | |

---

## 11. Appendix: Required Compound Indexes

```js
// AdvancedTicket
{ status: 1, 'sla.firstResponseAt': 1, 'sla.isBreached': 1, createdAt: -1 }

// NphiesClaim
{ 'nphies.submission.status': 1, 'nphies.submission.updatedAt': 1, 'nphies.submission.submittedAt': 1 }
```

---

## 12. Appendix: Emergency Contacts

Add your team contacts here:

- **On-call:** ________________
- **DBA:** ________________
- **Platform:** ________________
- **Slack channel:** ________________
