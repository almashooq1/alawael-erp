# Deployment Notes — W1437 (feat/w1406-preflight-followup)

> Generated: 2026-06-21  
> Updated: 2026-06-22T02:15:00+03:00  
> Branch: `feat/w1406-preflight-followup`  
> PR: [#579](https://github.com/almashooq1/alawael-erp/pull/579)

## Related runbooks

- **Quick cheat sheet:** `docs/W1437_DEPLOY_CHEAT_SHEET.md`
- **Full runbook (PDF):** `docs/RUNBOOK_W1437.pdf`  
  Generate with: `python3 scripts/generate-runbook-pdf.py`
- **Full runbook (Markdown):** `docs/RUNBOOK_W1437.md`
- **Wiki page:** `docs/WIKI_W1437.md` (copy to GitHub Wiki)
- **Deployment status:** `docs/W1437_DEPLOY_STATUS.md`  
  Update with: `node scripts/track-deploy-status.js`
- **Problem ledger:** `docs/PROBLEM_LEDGER_v6.md`

## Pre-deploy readiness

Run the final review script locally before any production deploy:

```bash
./scripts/final-review-w1437.sh
```

It checks:
- Current branch is `main` and clean
- `main` is up to date with `origin/main`
- All required scripts exist
- Syntax checks pass
- Backend pre-push gates pass
- Local migration test passes (MongoMemoryServer)

## Scope

This release contains:

- **W1427–W1435**: DDD subscriber fixes, session-ref drift fixes, MongoMemoryServer fixes, DB compound indexes, npm audit fixes.
- **W1436**: Structured diagnostics for LLM anomaly save failures.
- **W1437**: Production DB timeout root-cause fixes (`AdvancedTicket` `$nin` → `$in`, `NphiesClaim.updatedAt` schema fix).
- **Bulk sync**: All previously pending working-tree changes committed, including new backend modules (beneficiary lifecycle, journey score, access console, clinical legacy adapter), frontend components, docs, and security/config files.

## Deployment methods

Choose **one** of the following methods based on your production setup:

### Method A: VPS / bare-metal (_pm2/systemd_)

Use `scripts/deploy-w1437.sh` (see detailed steps below).

Or run the existing VPS deploy script with the migration integrated:

```bash
export MONGODB_URI="mongodb+srv://..."
./scripts/deploy-vps.sh --with-w1437-migration
```

This will:
1. Run `scripts/deploy-w1437.sh` on the VPS via SSH
2. Deploy backend + frontend as usual
3. Verify `/health` and `/api/v1/build-info`

**Dry run (estimate impact without writing):**
```bash
export MONGODB_URI="mongodb://..."
DRY_RUN=1 NODE_ENV=production node backend/scripts/migrate-nphies-claim-updatedAt.js
```

**Rollback (application code only):**
```bash
export DEPLOY_ROOT=/opt/alawael-erp
./scripts/rollback-w1437.sh
```

### Method B: Docker Compose

Use `scripts/deploy-w1437-docker.sh`.

```bash
export MONGODB_URI="mongodb+srv://..."
export COMPOSE_FILE="docker-compose.professional.yml:docker-compose.production.yml"
export COMPOSE_PROJECT_NAME=alawael
./scripts/deploy-w1437-docker.sh up
```

Use `./scripts/deploy-w1437-docker.sh migrate-only` to run only the migration without restarting services.

### Method C: GitHub Actions

Trigger the manual workflow **"🗄️ W1437 Production Migration"** (`w1437-migrate.yml`):

- Go to Actions → "🗄️ W1437 Production Migration" → Run workflow
- Type `migrate` in the confirm field
- Check **"نشر التطبيق بعد الميجرشن؟"** if you also want the workflow to deploy backend + frontend

Required secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `MONGODB_URI`.
Optional secrets: `DEPLOY_ROOT` (default `/home/alawael/app`).

After deployment, trigger **"👁️ W1437 Post-Deploy Monitor"** (`w1437-monitor.yml`) to run the 30-minute log watch from GitHub Actions.

### Method D: Automatic migration on every deploy

The production deploy workflow (`deploy-hostinger.yml`) has an optional W1437 migration step. Enable it by setting the repository variable:

```
RUN_W1437_MIGRATION = true
```

This is idempotent, so it is safe to leave enabled until the release is stable, then remove the variable.

## Prerequisites before deploy

1. **Resolve merge conflicts with `main`** ✅ DONE — PR #579 **MERGED** to `main`.  
   Squash-merged at `2026-06-21T21:42:10Z` (merge commit `009c676bd`). Conflicts with `origin/main` (PRs #580–#588) were resolved before merge via merge commits `7f2b26176`, `4dcb891a1`, `b40c2f993`, and post-merge rebase around `76ab95e87` (#588). The merge required `CHECK_WAVE_SKIP=1` for the wave-collision gate because the push range included `origin/main` commits whose wave numbers already exist on `main`.
   
   **Post-merge hotfix W1444**: `backend/scripts/migrate-nphies-claim-updatedAt.js` was fixed to use `NphiesClaim.collection.updateMany(...)` because Mongoose rejected the aggregation-pipeline update. Run the **latest version** of the script from `main`.

2. **Run the NphiesClaim backfill migration** in production **before** deploying the new application code.

   You can use the provided executor script (recommended):

   ```bash
   export MONGODB_URI="mongodb://..."
   export NODE_ENV=production
   export DEPLOY_ROOT=/opt/alawael-erp
   ./scripts/deploy-w1437.sh
   ```

   Or run the migration manually:

   ```bash
   cd /opt/alawael-erp
   git pull origin main
   NODE_ENV=production node backend/scripts/migrate-nphies-claim-updatedAt.js
   ```

   This sets `nphies.submission.updatedAt` for existing documents where it is missing. Without this, the reconciliation sweeper will skip old `PENDING_REVIEW` claims.

3. **Verify production MongoDB compound indexes** for `AdvancedTicket` and `NphiesClaim` are built. The `deploy-w1437.sh` script checks them automatically. Mongoose `autoIndex` builds them on startup if enabled; otherwise build them manually:

   ```js
   db.advancedtickets.createIndex({ status: 1, 'sla.firstResponseAt': 1, 'sla.isBreached': 1, createdAt: -1 });
   db.nphiesclaims.createIndex({ 'nphies.submission.status': 1, 'nphies.submission.updatedAt': 1, 'nphies.submission.submittedAt': 1 });
   ```

## Test status

- **Focused regression tests**: ✅ 51/51 pass.
- **Pre-push gates**: ✅ All 7 backend gates pass (sprint-paths sync, route-load smoke, gitignored-sources, hook-style, wave-collision, phantom-writes, route-shadowing, lint).
- **Full `test:sprint`**: ⚠️ Completed in ~46 min with `968 passed, 10 failed` suites and `16403 passed, 1 skipped, 22 failed` tests.
  - 8 failures are **transient** (suites pass when run individually; likely MongoMemoryServer / babel cache / resource contention under full load).
  - 2 failures are **consistent**:
    - **W1399** — pre-deployment checklist table regex was too strict; fixed locally and verified.
    - **W1405** — missing monitoring files (`ops/grafana/provisioning/dashboards/alawael-dashboard.json`, `ops/alerting-rules.yml`, etc.) are pre-existing infrastructure drift, not introduced by this release.

## Deployment steps

1. ✅ PR #579 merged to `main` (including post-merge hotfix W1444).
2. Deploy backend services.
3. Deploy frontend build.
4. Deploy mobile build (if applicable).
5. Verify application starts without errors.

## Post-deployment verification

### 1. Smoke tests (30 seconds)

```bash
./scripts/smoke-test-w1437.sh https://alaweal.org
```

Checks:
- `/health` returns 200
- `/api/v1/build-info` contains commit
- SLA stats and NPHIES reconciliation endpoints are reachable
- TLS certificate is valid

### 2. Log monitoring (30 minutes)

Continue with the 30-minute monitor as described below.

1. **P0-1 / P0-2 DB timeouts**: Watch `error1.log` for 30 minutes. The following messages should stop:

   - `Operation advancedtickets.find() buffering timed out after 10000ms`
   - `Operation nphiesclaims.find() buffering timed out after 10000ms`

2. **P2-4 LLM anomaly save failure**: Watch `error1.log` for:

   - `[llm-anomaly-history] save failed:` — should stop if root cause was DB timeouts.
   - If it persists, the new structured log line includes `name=`, `code=`, `source=`, `total=`, `recordedAt=` for diagnosis.

3. **NPHIES reconciliation sweeper**: Confirm it is polling old `PENDING_REVIEW` claims and transitioning them.

4. **SLA scheduler**: Confirm `checkResolutionBreaches`, `assignMissingSlaDeadlines`, and `getSlaStats` complete without timeout errors.

## Rollback

Use the provided rollback script:

```bash
export DEPLOY_ROOT=/opt/alawael-erp
./scripts/rollback-w1437.sh [TARGET_COMMIT_OR_TAG]
```

- If `TARGET_COMMIT_OR_TAG` is omitted, the script rolls back to the commit immediately before the W1437 merge (`009c676bd^1`).
- The script backs up the current `backend/` and `frontend/` directories.
- The W1437 migration data is **NOT** removed — it is safe to leave `nphies.submission.updatedAt` populated; old code will simply ignore it.

Manual alternative:
- Revert the merge commit on `main`.
- Re-deploy the previous release.

## Dependency audit

`npm outdated` was re-run across root/backend/frontend/mobile/services. No security vulnerabilities (`npm audit` clean). Available updates fall into two buckets:

- **Safe patch/minor bumps** (can be applied in a quick follow-up PR):
  - Backend: `axios` 1.17→1.18, `mongoose` 9.6→9.7, `joi` 18.2.1→18.2.3, `csv-stringify` 6.7→6.8, `prettier` 3.8.3→3.8.4, `stripe` 22.2.0→22.2.2, `uuid` 14.0.0→14.0.1.
  - Root/frontend/supply-chain/mobile: assorted minor bumps (MUI 9.0→9.1, tailwindcss 4.2→4.3.1, @sentry/react, @typescript-eslint/parser, etc.).
- **Major bumps deferred** to a dedicated dependency wave due to breaking-change risk:
  - Backend: Express 4→5, Firebase Admin 13→14, Helmet 7→8, archiver 7→8, dotenv 16→17, pdfkit 0.18→0.19, puppeteer 24→25, rate-limit-redis 4→5, zod 3→4.
  - Frontend: React 18→19, Vite 6→8, Jest 29→30, Babel 7→8.
  - Mobile: Expo 49→56, React Native 0.72→0.86, navigation ecosystem 6→7.

## Final pre-deployment checklist

Use this list in the deployment channel / runbook before cutting the release.

### 1. Code readiness

- [x] PR #579 merged to `main` (squash merge `009c676bd`).
- [x] Post-merge hotfix W1444 applied (`migrate-nphies-claim-updatedAt.js` uses native collection driver).
- [x] Latest `main` pulled locally (`git pull origin main`).
- [x] Pre-push gates pass on `main`:
  - [x] `check:sprint-paths`
  - [x] `check:routes-load`
  - [x] `check:gitignored-sources`
  - [x] `check:hook-style`
  - [x] `check:phantom-writes`
  - [x] `check:route-shadowing`
  - [x] frontend / supply-chain / mobile lint
- [x] Focused regression tests pass (W1436/W1437 + W1399).

### 2. Infrastructure readiness

- [ ] Production MongoDB backup completed in last 24h.
- [ ] `MONGODB_URI` points to production cluster.
- [ ] `NODE_ENV=production` set for the migration run.
- [ ] Rollback plan documented and on-call engineer notified.

### 3. Database migration (run BEFORE deploying app code)

Recommended — use the executor:

```bash
export MONGODB_URI="mongodb://..."
export NODE_ENV=production
export DEPLOY_ROOT=/opt/alawael-erp
./scripts/deploy-w1437.sh
```

Or manually:

```bash
cd /opt/alawael-erp   # or your deployment root
git pull origin main
NODE_ENV=production node backend/scripts/migrate-nphies-claim-updatedAt.js
```

Expected output:

```
[migrate-nphies-claim-updatedAt] done { matched: <N>, modified: <N> }
```

- [ ] Migration executed successfully.
- [ ] Production compound indexes verified (or rely on Mongoose `autoIndex`):
  ```js
  db.advancedtickets.createIndex({ status: 1, 'sla.firstResponseAt': 1, 'sla.isBreached': 1, createdAt: -1 });
  db.nphiesclaims.createIndex({ 'nphies.submission.status': 1, 'nphies.submission.updatedAt': 1, 'nphies.submission.submittedAt': 1 });
  ```

### 4. Deploy

- [ ] Backend services deployed from `main`.
- [ ] Frontend build deployed.
- [ ] Mobile build deployed (if applicable).
- [ ] Application starts without boot errors.

### 5. Post-deploy verification (30 min)

Use the appropriate monitor script:

- **VPS / bare-metal:**
  ```bash
  ./scripts/monitor-w1437.sh logs/error1.log
  ```

- **Docker Compose:**
  ```bash
  ./scripts/monitor-w1437-docker.sh alawael-backend-1
  ```

Or manually watch `error1.log` / container logs for these messages. They should **stop** after deploy:

- [ ] `Operation advancedtickets.find() buffering timed out after 10000ms` (P0-1)
- [ ] `Operation nphiesclaims.find() buffering timed out after 10000ms` (P0-2)
- [ ] `[llm-anomaly-history] save failed:` (P2-4)

Also verify:

- [ ] NPHIES reconciliation sweeper is transitioning old `PENDING_REVIEW` claims.
- [ ] SLA scheduler (`checkResolutionBreaches`, `assignMissingSlaDeadlines`, `getSlaStats`) completes without timeout errors.

## Grafana / Loki alerts

A Loki alerting rule file is provided at `ops/loki-rules-w1437.yml`. It detects:

- `Operation advancedtickets.find() buffering timed out after 10000ms`
- `Operation nphiesclaims.find() buffering timed out after 10000ms`
- `[llm-anomaly-history] save failed:`

To enable:

1. Mount the file into the Loki container:
   ```yaml
   volumes:
     - ./ops/loki-rules-w1437.yml:/loki/rules/fake/w1437.yml:ro
   ```

2. Ensure Loki `ruler` is configured with `alertmanager_url`.

3. Restart Loki and verify:
   ```bash
   curl http://localhost:3100/loki/api/v1/rules
   ```

## Feature flags

W1437 behavior can be disabled at runtime without redeploying:

```bash
FEATURE_W1437=false
```

When disabled:
- `ticketSlaScheduler` falls back to `$nin` query
- `nphiesReconciliationService.sweep` falls back to pre-W1437 query
- `NphiesClaim` pre-save hook stops auto-updating `updatedAt`

Default is `true`.

## Notifications & audit

The deployment scripts can send notifications on start, migration success, and migration failure.

```bash
export SLACK_WEBHOOK="https://hooks.slack.com/services/..."
# OR
export TEAMS_WEBHOOK="https://outlook.office.com/webhook/..."
# OR
export PAGERDUTY_INTEGRATION_KEY="..."
# OR
export SENTRY_DSN="..."
./scripts/deploy-w1437.sh
```

A deployment log is written to stdout. Capture it for audit:

```bash
./scripts/deploy-w1437.sh 2>&1 | tee "logs/deploy-w1437-$(date +%Y%m%d-%H%M%S).log"
```

## Known risks / follow-up work

- **Dependency updates**: Major bumps are intentionally deferred to a dedicated dependency wave to keep this release focused.
- **W1405 monitoring files**: Missing Grafana dashboard and AlertManager rules are pre-existing drift; either create the files or update the guard in a monitoring wave.
- **web-admin repo**: Not present locally; not validated in this release.
- **IEP/session model fragmentation**: ADR-044 and ADR-045 still pending stakeholder decision.

## Sign-off

| Role | Name | Sign-off | Date |
| ---- | ---- | -------- | ---- |
| Release owner | | | |
| DevOps/DBA | | | |
| On-call engineer | | | |
