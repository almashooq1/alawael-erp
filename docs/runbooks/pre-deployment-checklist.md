# Pre-Deployment Checklist

**Purpose:** Unified operational checklist before deploying to production or staging. Prevents silent configuration failures by verifying all security-critical and operational prerequisites are in place.

**Owner:** DevOps / Release Team
**Frequency:** Every deployment
**Runbook Chain:** Part of `docs/runbooks/` (see also [env-preflight-check.md](env-preflight-check.md), [DAST guide in SECURITY.md](../../SECURITY.md#dynamic-security-scanning-dast))

---

## Quick Checklist

```bash
# 1. Verify environment configuration
npm run env:check

# 2. Verify DAST target (if running security scan)
# See: DAST_TARGET_URL env var + docs/SECURITY.md

# 3. Verify route paths (no shadowing / TDZ issues)
npm run check:routes-load

# 4. Verify sprint tests are in sync with CI triggers
npm run check:sprint-paths

# 5. Run pre-push quality gates
npm run quality:push
# Expected output:
#   ✅ test:guard (maintenance-mocks, model-collisions, sprint-paths)
#   ✅ test:domains (66 suites, 798 tests)
#   ✅ test:phase2 (7 auth tests)

# 6. If deploying to production:
#   - Notify ops team (Slack #deployments)
#   - Verify database backups complete (last 24h)
#   - Verify CDN caches cleared (if applicable)
#   - Confirm rollback plan is documented
```

---

## Phase 1: Environment & Configuration

### 1.1 Required Environment Variables (Strict Mode)

Run `npm run env:check` to verify all security-critical keys are set:

| Key                  | Enforced In    | Status |
| -------------------- | -------------- | ------ |
| `MONGODB_URI`        | Production, CI | ◯      |
| `JWT_SECRET`         | Production, CI | ◯      |
| `JWT_REFRESH_SECRET` | Production, CI | ◯      |
| `ENCRYPTION_KEY`     | Production, CI | ◯      |
| `SESSION_SECRET`     | Production, CI | ◯      |

**Exit code:**

- `0` = all keys present ✓ → proceed to phase 2
- `1` = one or more missing ✗ → fix and retry

**Reference:** [Environment Preflight Check](env-preflight-check.md)

### 1.2 Optional Environment Variables (Recommended for Full Features)

| Key                             | Purpose                      | If Missing                                 | Reference                                                       |
| ------------------------------- | ---------------------------- | ------------------------------------------ | --------------------------------------------------------------- |
| `DAST_TARGET_URL`               | DAST baseline scanning       | Scans skipped (not critical)               | [SECURITY.md](../../SECURITY.md#dynamic-security-scanning-dast) |
| `ENABLE_RESPITE_NOSHOW_SWEEPER` | Auto-mark no-shows after 24h | Respite admin handles manually             | docs/runbooks/respite-booking.md                                |
| `ENABLE_CAPA_SWEEPER`           | Corrective action aging      | CAPA items age manually                    | docs/runbooks/quality-capa.md                                   |
| `NODE_ENV`                      | Runtime mode                 | Defaults to `development` (unsafe in prod) | `development` \| `production` \| `staging`                      |

---

## Phase 2: Code & Tests Quality

### 2.1 Route Loading & Module Initialization

```bash
npm run check:routes-load
```

Verifies:

- All 501 route files under `backend/routes/` load without `require()` errors (TDZ class)
- No module-scope code throws on `require()`
- No guard middleware is used before it's imported (ordering bug W441)

**Expected:** `✓ All route files load successfully`

**If fails:** Check error output for which route file threw. Common causes:

- `router.use(middleware)` before `const middleware = require(...)`
- Circular dependency in model imports
- Missing dependency on `require('mongoose')`

### 2.2 Sprint Test Synchronization

```bash
npm run check:sprint-paths
```

Verifies:

- `backend/sprint-tests.txt` contains exactly the paths in `.github/workflows/sprint-tests.yml`
- 1682 entries × 2 blocks (push + PR triggers) = 3364 expected occurrences
- No orphaned test files in CI, no missing entries

**Expected:** `✓ sprint-tests.yml is in sync (1682 entries × 2 blocks = 3364 expected occurrences)`

**If fails:** Run `npm run sync:sprint-paths` to auto-fix (appends missing entries), then commit.

### 2.3 Full Pre-Push Quality Gates

```bash
npm run quality:push
```

Runs three test suites in sequence:

#### 2.3a Test Guard (Maintenance, Model Collisions, Sprint Sync)

```
✅ Maintenance mock centralization check passed.
[guard:model-collisions] 1126 mongoose.model() registrations across 1126 unique names; 0 colliding (baseline ≤ 0).
✓ sprint-tests.yml is in sync (1682 entries × 2 blocks = 3364 expected occurrences)
```

Checks:

- Maintenance mocks are centralized (not scattered)
- No mongoose.model() name collisions (each name registered in exactly one file)
- Sprint test list matches CI trigger paths

#### 2.3b Domain Tests (66 suites, 798 tests)

```
Test Suites: 66 passed, 66 total
Tests:       798 passed, 798 total
Time:        ~7-8s
```

Covers:

- ~12 core domain layers (beneficiary, episodes, assessments, etc.)
- Model lifecycle (create, update, delete, transitions)
- Service-layer business logic

**Common failures:**

- Model schema change without migration → tests expect old fields
- Service method signature changed → tests call with wrong args
- Mongoose index or validation rule altered → `.create()` or `.save()` now rejects

#### 2.3c Phase 2 Auth Tests (7 tests)

```
Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
Time:        ~8-10s
```

Covers:

- `POST /api/auth/register` (success 201, invalid email 400, duplicate 400)
- `POST /api/auth/login` (success 200, wrong password 401, server error 500)
- `POST /api/auth/logout` (success 200)

**Common failures:**

- JWT secrets missing or wrong format
- Password hashing service unavailable
- Session/cookie middleware not initialized

---

## Phase 3: DAST & Security Scanning

### 3.1 DAST Target Validation (Optional but Recommended)

If running OWASP ZAP baseline scan on this deployment:

```bash
# Check that DAST_TARGET_URL is set and valid
echo $DAST_TARGET_URL
# Expected format: https://staging.example.com or https://api.example.com
# NOT production URLs without explicit allow_production=true override
```

**If deploying to staging:** `DAST_TARGET_URL=https://staging-api.example.com` ✓

**If deploying to production:**

- Default-deny — DAST runs on staging only
- To override: Set `ALLOW_PRODUCTION=true` in GitHub Actions `workflow_dispatch` input
- Never run blind baseline scan on production (exfiltration risk)

**Reference:** [Dynamic Security Scanning in SECURITY.md](../../SECURITY.md#dynamic-security-scanning-dast)

### 3.2 Gitleaks Secret Scanning

Runs automatically on PR (checks diff) + push to `main` (checks full history) + weekly.

**Manual check** (before deployment):

```bash
gitleaks detect --source . --verbose
```

If found: Remove secret, rotate keys, re-commit before proceeding.

---

## Phase 4: Deployment-Specific Checks

### 4.1 Production Deployments

- [ ] **Database backup completed** in last 24h → Check backup service logs
- [ ] **Rollback plan documented** → PR description includes revert commands
- [ ] **On-call team notified** → Slack #ops-alerts + email
- [ ] **Feature flags for gradual rollout** (if applicable) → Stage at 10%, 50%, 100%
- [ ] **Monitoring alerts configured** → Prometheus/Grafana dashboards tuned to baseline

### 4.2 Staging Deployments

- [ ] **Dev team notified** → Slack #staging-updates
- [ ] **DAST scan scheduled** → Trigger manual scan after deploy (30 min cutoff)
- [ ] **Smoke tests passed locally** → Last CI run green
- [ ] **Log aggregation enabled** → Datadog / ELK searchable

### 4.3 All Deployments

- [ ] **All `npm run quality:push` gates passed** → No warnings or errors
- [ ] **Database migrations applied** (if schema changed) → Manual or via deployment script
- [ ] **Secrets rotated if any exposure risk** → New JWT secrets, API keys, etc.
- [ ] **CDN cache cleared** (if applicable) → Invalidate stale API responses

---

## Failure Scenarios & Recovery

### Scenario A: `env:check` fails (1 or more keys missing)

**Action:**

1. Generate missing key(s) via `openssl rand -base64 <size>` (see [env-preflight-check.md](env-preflight-check.md))
2. Set in deployment environment (GitHub Secrets, CI/CD config, or `.env`)
3. Re-run `npm run env:check` → should exit 0
4. Retry deployment

**Do NOT deploy with exit 1** — app will crash on boot with "missing critical key" error.

### Scenario B: `npm run quality:push` fails

**Most common causes:**

1. **Domain tests fail** → Model/service logic regression

   - Re-check last code change for schema or service API mismatch
   - Run affected test locally: `npx jest __tests__/<domain>.domain.test.js`
   - If new test data needed: Add fixture or seed
   - **Rollback the code change** if fix is non-trivial (release candidate shouldn't carry hotfixes)

2. **Auth tests fail** → JWT or password service broken

   - Verify JWT secrets are set (`env:check`)
   - Check bcrypt availability (npm install bcrypt)
   - Verify AuthService is wired into startup (`backend/startup/`)
   - **Revert environment changes** if secrets were rotated incorrectly

3. **Sprint paths out of sync** → New test added but not enrolled
   - Run `npm run sync:sprint-paths` to auto-fix
   - This appends new test files to `.github/workflows/sprint-tests.yml`
   - Commit the updated `sprint-tests.txt` and workflows/yml

### Scenario C: Route loading fails (check:routes-load)

**Cause:** Likely `router.use(guard)` before `const guard = require(...)` or circular import.

**Action:**

1. Error message names the offending route file
2. Open `backend/routes/<X>.routes.js`
3. Move all `require()` statements to the top of the file
4. Move all `router.use()` calls **below** the require statements
5. Re-run `npm run check:routes-load`

**Example:**

```javascript
// ❌ Wrong (fails TDZ check)
router.use(protect); // guard not defined yet
const protect = require('./middleware/auth.middleware');

// ✓ Correct
const protect = require('./middleware/auth.middleware');
router.use(protect);
```

### Scenario D: Deployment hangs or times out

**Possible causes:**

- MongoDB connection timeout → Verify `MONGODB_URI` is reachable
- Secrets fetch hanging → Check secret manager (AWS Secrets, Azure Key Vault)
- Large test suite running → `npm run quality:push` takes ~30s; wait for completion

**Action:**

1. Check logs: `kubectl logs -f deployment/backend` (K8s) or container logs
2. If stuck in test gate: Kill and retry (gates are idempotent)
3. If connection timeout: Verify network access to MongoDB, Redis, external APIs

---

## Maintenance & Updates

This checklist references several documents and scripts. When updating them, remember to keep this checklist in sync:

- `docs/runbooks/env-preflight-check.md` → Referenced in Phase 1
- `.github/workflows/dast.yml` → Referenced in Phase 3
- `SECURITY.md#dynamic-security-scanning-dast` → Referenced in Phase 3
- `backend/scripts/check-routes-load.js` → Referenced in Phase 2.1
- `backend/scripts/check-sprint-paths.js` → Referenced in Phase 2.2

A test (`backend/__tests__/pre-deployment-checklist-wave1399.test.js`) guards this document for drift.

---

## See Also

- [Operational Runbooks](README.md) — Full runbook index
- [SECURITY.md](../../SECURITY.md) — Vulnerability scanning, DAST, compliance
- [THREAT_MODEL.md](../../security/THREAT_MODEL.md) — Trust boundaries and mitigations
- [Deployment RUNBOOK](../blueprint/23-go-live-checklist.md) — Production go-live procedures
- [DR Verification](../blueprint/19-dr-verification.md) — Disaster recovery verification
