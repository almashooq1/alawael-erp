# Performance & Load Testing Runbook

**Owner:** DevOps / Performance Engineering
**Frequency:** Weekly (scheduled) + On-demand (manual via workflow_dispatch)
**Runbook Chain:** Part of `docs/runbooks/` (see also [env-preflight-check.md](env-preflight-check.md), [pre-deployment-checklist.md](pre-deployment-checklist.md), SECURITY.md, go-live-checklist.md)

---

## Quick Start

```bash
# 1. Ensure k6 is installed
k6 version  # If not: https://k6.io/docs/getting-started/installation

# 2. Start the backend (if running locally)
cd backend && npm run dev

# 3. Run baseline load test (warm-up → climb → peak → ramp-down)
npm run test:load

# 4. Run government integration test (NPHIES + GOSI read surfaces)
TOKEN=<your-jwt> npm run test:load:gov

# 5. Run smoke test (sanity check)
npm run test:load:smoke
```

---

## Overview

Performance testing validates that the system can sustain expected load without violating Service Level Objectives (SLOs). This runbook documents:

- **Three load profiles:** smoke test (single endpoint), baseline (liveness + readiness), gov-integrations (NPHIES/GOSI read-heavy paths)
- **SLO thresholds:** Per-path budgets (health `p95<200ms`, readiness `p95<800ms`, gov `p95<1200-1500ms`, global fail rate `<1-2%`)
- **CI integration:** Scheduled weekly baseline + on-demand manual testing via GitHub Actions
- **Safety guardrails:** Read-only profiles (no mutating operations), mock mode fallback, health check validation

---

## Profile 1: Smoke Test (k6-smoke.js)

**Purpose:** Minimal sanity check — validates that k6 runs, baseline latency is acceptable, no bootstrap errors.

**What it tests:**

- Single endpoint: `GET /api/test` (or `GET /health` if reconfigured)
- Flat load: 10 virtual users (VUs) for 30 seconds
- No SLO thresholds (informational only)

**When to use:**

- Pre-flight validation before running heavier profiles
- Quick confirmation that target environment is responding
- Debugging k6 configuration or TOKEN issues

**Run locally:**

```bash
npm run test:load:smoke
```

**Run against staging:**

```bash
BASE_URL=https://staging.your-domain.com npm run test:load:smoke
```

---

## Profile 2: Baseline Load Test (k6-load.js)

**Purpose:** Realistic multi-stage load profile. Validates that liveness (health checks) and readiness (DB/dependency probes) stay within SLO budgets under sustained peak load.

**What it tests:**

1. **Liveness** (`GET /health`) — must stay fast (< 200ms p95) even under peak load
2. **Readiness** (`GET /readiness`) — DB/dependency probes, looser budget (< 800ms p95) due to IO
3. **Authed read** (optional, if TOKEN is set) — any high-traffic GET endpoint you choose (e.g., `/api/beneficiaries/me`)

**Load stages:**

```
30s   — warm-up:       0 → 10% of peak
1m    — climb:         10% → 50% of peak
30s   — reach peak:    50% → 100% of peak
2m    — sustain peak:  100% of peak (default, override with PEAK_DURATION)
30s   — ramp-down:     100% → 0 (graceful shutdown)
```

**SLO thresholds (global pass/fail):**
| Metric | Budget | Impact |
|--------|--------|--------|
| `health_latency` p95 | < 200ms | Liveness SLO breach → exit 1 |
| `health_latency` p99 | < 400ms | Liveness warning → exit 1 if p95 also breached |
| `readiness_latency` p95 | < 800ms | Readiness SLO breach → exit 1 |
| `readiness_latency` p99 | < 1500ms | Readiness warning → exit 1 if p95 also breached |
| Overall failure rate | < 1% | Global: any endpoint `http_req_failed > 1%` → exit 1 |

**Run locally (default: 100 VUs, 2m peak):**

```bash
npm run test:load
```

**Run with custom peak:**

```bash
# 200 VUs, 5 minute peak
PEAK_VUS=200 PEAK_DURATION=5m npm run test:load
```

**Run against staging with authed read:**

```bash
BASE_URL=https://staging.your-domain.com TOKEN=eyJ... npm run test:load
```

**Interpreting the summary:**

```
✓ health_latency................: avg=45.2ms  p(95)=142ms p(99)=238ms
✓ readiness_latency.............: avg=123ms   p(95)=567ms p(99)=1234ms
✓ http_req_failed...............: 0.42%  ✓ (under 1% budget)

Baseline PASSED → Production ready ✅
```

If any threshold fails:

```
✗ health_latency p(95)=245ms   EXCEEDED 200ms budget
✗ Threshold breach detected

Baseline FAILED → Investigate performance regression ❌
```

---

## Profile 3: Government Integration Load Test (k6-gov-integrations.js)

**Purpose:** Capacity test for Saudi government integration read paths (NPHIES + GOSI). These are heavier than baseline because they touch external sandbox APIs (or mock equivalents) and aggregation logic.

**What it tests (READ-ONLY by design):**

1. **NPHIES read surfaces:**

   - `GET /api/v1/nphies/status` — cached integration status
   - `GET /api/v1/nphies/cpt-codes?limit=20` — CPT code catalog lookup

2. **GOSI read surfaces:**
   - `GET /api/v1/gosi-full/rates` — static rate tables
   - `GET /api/v1/gosi-full/dashboard` — aggregated dashboard metrics

**Safety guardrails (enforced by drift guard):**

- ✅ Endpoints are read-only (GET only)
- ❌ NO mutating operations (claim-submit, prior-auth, register, send)
- ❌ NO external dispatch calls (would spam NPHIES/GOSI sandboxes)
- Violation → SLO breach deliberately → gate fails → merge blocked

**SLO thresholds (per-provider):**
| Provider | Metric | Budget | Rationale |
|----------|--------|--------|-----------|
| NPHIES | p95 latency | < 1200ms | External API + cache layer |
| NPHIES | p99 latency | < 2500ms | Sandbox variance tolerance |
| GOSI | p95 latency | < 1500ms | Aggregation logic overhead |
| GOSI | p99 latency | < 3000ms | Aggregation variance tolerance |
| Global | failure rate | < 2% | Gov deps slightly flakier than core |

**Authentication (REQUIRED):**

```bash
# Without TOKEN, gov tests skip silently (liveness still runs)
npm run test:load:gov
# → Output shows gov groups empty, signals config gap

# With TOKEN, gov groups run
TOKEN=eyJ... npm run test:load:gov
# → Measures NPHIES + GOSI read capacity
```

**Run locally with token:**

```bash
TOKEN=<your-jwt-token> npm run test:load:gov
```

**Run against staging with custom peak:**

```bash
BASE_URL=https://staging.your-domain.com \
TOKEN=<staging-jwt> \
PEAK_VUS=200 \
PEAK_DURATION=5m \
npm run test:load:gov
```

**Interpreting results:**

```
✓ nphies_read_latency...: p(95)=1087ms p(99)=1834ms  ✓ (under 1200/2500 budget)
✓ gosi_read_latency.....: p(95)=1412ms p(99)=2567ms  ✓ (under 1500/3000 budget)
✓ gov_read_failed.......: 1.2%                       ✓ (under 2% budget)

Government integration PASSED → Ready for gov sandbox scale-up ✅
```

---

## CI Integration: Weekly Scheduled + On-Demand

### Automatic: Weekly Baseline (Tuesday 03:00 UTC)

**Trigger:** `.github/workflows/load-testing.yml` schedule block
**Profile:** Baseline load test (W1304)
**Target:** Staging environment (requires `STAGING_API_URL` secret)
**Frequency:** Every Tuesday at 03:00 UTC (off-peak for operational impact)

**Artifacts:**

- Job summary: GitHub Actions summary tab
- Status: Pass/fail reported in deployment dashboard

### Manual: On-Demand via workflow_dispatch

**Trigger:** GitHub Actions → load-testing workflow → "Run workflow" button
**Inputs:**

- `target_env` (choice: local / staging / production)
  - ⚠️ **production DENIED by policy** (returns exit 1)
  - ✅ local: for developer laptop testing (http://localhost:3001)
  - ✅ staging: for pre-deployment validation
- `peak_vus` (integer, default 100) — override peak load level
- `peak_duration` (duration string, default "2m") — override sustain time
- `run_gov_tests` (boolean, default false) — optionally run gov integration test in addition to baseline

**Example invocations:**

```
# Staging baseline (default)
target_env: staging
peak_vus: 100
peak_duration: 2m
run_gov_tests: false

# Staging stress test with gov suite
target_env: staging
peak_vus: 300
peak_duration: 5m
run_gov_tests: true

# Local validation (dev machine with backend running)
target_env: local
peak_vus: 50
peak_duration: 1m
run_gov_tests: false
```

---

## Authentication & Secrets

### Setup (one-time):

1. **Generate or locate a long-lived read-only JWT token** from your auth provider:

   ```bash
   # Example: using internal token endpoint
   curl -X POST https://your-auth-server/token \
     -d "client_id=<load-testing-client>" \
     -d "grant_type=client_credentials" \
     -d "scope=read:gov-api" \
     -o token.txt
   ```

2. **Store as GitHub secret `LOAD_TEST_AUTH_TOKEN`:**

   - Navigate: Repository Settings → Secrets → New repository secret
   - Name: `LOAD_TEST_AUTH_TOKEN`
   - Value: `eyJ...` (full JWT)
   - Scope: Environment (`production` if using prod staging)

3. **Configure staging URL** (if different from default):
   - Secret: `STAGING_API_URL`
   - Value: `https://staging.your-domain.com`

### Local testing (no secrets needed):

```bash
# Generate a temporary token locally
npm run auth:token:dev
# → outputs: eyJ...

# Use it in load test
TOKEN=<paste-output> npm run test:load:gov
```

---

## Runbook: Troubleshooting Common Failures

### Scenario 1: Health Check Failed (HTTP 000 / Connection Refused)

**Symptom:**

```
❌ Health check failed (HTTP 000). Target may be offline.
```

**Causes:**

- Backend is not running
- Network connectivity issue
- DNS resolution failure
- Firewall blocking k6 outbound

**Fix:**

```bash
# Local: start the backend
cd backend && npm run dev
# Wait for "✅ Express server running on port 3001"

# Staging: verify DNS and connectivity
ping staging.your-domain.com
curl https://staging.your-domain.com/health
# Expected: HTTP 200

# If DNS fails: update STAGING_API_URL secret in GitHub
# If firewall: contact ops team
```

---

### Scenario 2: SLO Breach — Latency High

**Symptom:**

```
✗ health_latency p(95)=245ms   EXCEEDED 200ms budget
✗ Threshold breach detected
```

**Causes:**

- Backend under heavy real traffic (competing with test)
- Database query regression
- Memory pressure (OOM, GC pauses)
- Network degradation

**Fix:**

```bash
# 1. Check backend resource usage
kubectl top pods -n production  # or docker stats locally

# 2. Check slow query logs
curl http://localhost:3001/metrics | grep http_request_duration

# 3. Run during off-peak
# (automatic: scheduled for Tuesday 03:00 UTC)

# 4. Baseline on lighter load
PEAK_VUS=50 npm run test:load

# 5. If persistent: file performance investigation ticket
```

---

### Scenario 3: Auth Failed (401 Unauthorized)

**Symptom:**

```
auth_read_failed: 12.3%  ✗ (exceeds 2% budget)
```

**Causes:**

- TOKEN expired or invalid
- Token missing (`TOKEN=` unset)
- Insufficient scopes in token

**Fix:**

```bash
# Check token validity
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/readiness
# Expected: HTTP 200 or 503 (not 401)

# If 401: regenerate token
npm run auth:token:dev
TOKEN=<new-output> npm run test:load

# For CI: update LOAD_TEST_AUTH_TOKEN secret
```

---

### Scenario 4: Government Integration Token Not Set

**Symptom:**

```
⚠️  LOAD_TEST_AUTH_TOKEN not set. Skipping gov integration tests.
   Set this secret to enable: https://docs/runbooks/performance-load-testing.md#authentication
```

**Causes:**

- `LOAD_TEST_AUTH_TOKEN` secret not configured in GitHub
- Running locally without `TOKEN` env var

**Fix:**

```bash
# Local: pass TOKEN
TOKEN=eyJ... npm run test:load:gov

# CI: add secret to GitHub
# Settings → Secrets → New secret: LOAD_TEST_AUTH_TOKEN=eyJ...
```

---

## Maintenance & Tuning

### Weekly Review

After each scheduled run (Tuesday 03:00 UTC):

1. **Check GitHub Actions summary:**

   - All thresholds passed? ✅ No action needed.
   - Any failed? ❌ Investigate regression (see troubleshooting above).

2. **Baseline trending:**

   - Compare p95 latency week-over-week
   - Alert if trending upward > 10% (possible regression)

3. **Update SLOs if needed:**
   - After infrastructure changes (larger DB, faster network), re-baseline:
     ```bash
     npm run test:load  # capture new p95/p99 values
     # If new baseline is faster, tighten thresholds in k6-load.js
     # If new baseline is slower, loosen thresholds to reflect reality
     ```

### Tuning Load Parameters

Edit `k6-load.js` or `k6-gov-integrations.js` to adjust:

| Parameter            | Location  | Effect                            |
| -------------------- | --------- | --------------------------------- |
| `PEAK_VUS`           | env / CLI | How many concurrent users at peak |
| `PEAK_DURATION`      | env / CLI | How long to sustain peak          |
| Ramp stages          | script    | Warm-up/climb/ramp-down timing    |
| `thresholds`         | script    | SLO budget per metric             |
| `NPHIES_STATUS_PATH` | env       | Override endpoint path            |

**Example: Re-baseline with aggressive load:**

```bash
PEAK_VUS=500 PEAK_DURATION=10m npm run test:load
# Pushes system to its breaking point
# Use results to identify bottleneck
```

---

## When to Run Performance Tests

**Mandatory:**

- ✅ Before each major version release (staging + gov)
- ✅ After infrastructure changes (DB upgrade, scaling)
- ✅ After adding new gov integrations (new endpoints → add to k6-gov-integrations.js)
- ✅ Weekly baseline (automatic, Tuesday 03:00 UTC)

**Recommended:**

- ✅ During code review of high-traffic endpoints (new GET /api/beneficiaries, etc.)
- ✅ After merging complex DB queries (new aggregation endpoints)
- ✅ After any caching layer changes (Redis, proxy)

**Not needed:**

- ❌ Every PR (too noisy; automatic weekly is enough)
- ❌ Trivial UI changes, documentation, non-routed code

---

## Best Practices

1. **Run during off-peak:** Test on staging/local, not production. (Policy enforces this.)
2. **No mutating operations:** k6 profiles are read-only by design. Drifts guards prevent POST/PUT/DELETE additions.
3. **Token scoping:** Use a read-only token with minimal privileges.
4. **Trend over time:** Compare runs week-to-week; single run is a snapshot.
5. **Pair with monitoring:** Correlate k6 results with Prometheus metrics from the same time window.
6. **Document deviations:** If you intentionally loosen a threshold, update both the threshold and this runbook with the reason.

---

## Related Runbooks

- [Environment Setup](environment-setup.md) — Configure secrets + staging URL
- [Pre-Deployment Checklist](pre-deployment-checklist.md) — Include load testing in go-live gate
- [Go-Live Checklist](../../blueprint/23-go-live-checklist.md) — Reference baseline SLOs
- [SECURITY.md](../../SECURITY.md#performance-load-testing) — Policy on production load testing (DENIED)

---

**Version:** W1401 (2026-06-17)
**Last updated:** 2026-06-17
**Next review:** After first scheduled run (Tuesday 2026-06-18 03:00 UTC)
