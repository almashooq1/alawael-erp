# Night Maintenance Plan — W1405

**Environment:** Staging / Pre-Production  
**Timezone:** Asia/Riyadh  
**Goal:** Keep runtime stable overnight with predictable checks, backups, and incident escalation.

## 1) Maintenance Window

- Daily window: **01:00 → 05:00** (Asia/Riyadh)
- Change freeze during window except emergency fixes
- Primary operator: Platform/Ops on-call

## 2) Nightly Execution Sequence

### Step A — Pre-check (01:00)

- Verify containers health (`backend`, `redis`, `mongodb`, `nginx`)
- Verify API liveness/readiness (`/health`, `/readiness`)
- Confirm critical env vars are present (`npm run env:check`)

### Step B — Backup verification (01:15)

- Run backup listing and validate latest successful backup exists
- Confirm backup retention policy (default 30 days)
- If backup gap > 24h → raise warning alert

### Step C — Sweeper/Cron status (01:30)

- Confirm enabled sweepers are wired and running
- Verify no repeated crash/restart loops for scheduler workers
- Spot-check runtime logs for cron exceptions

### Step D — Security/compliance drift check (02:00)

- Verify no critical startup env validation failures
- Verify alert routing config files still present and unchanged:
  - `ops/prometheus.yml`
  - `ops/alerting-rules.yml`
  - `ops/alertmanager.yml`
  - `ops/grafana/provisioning/**`

### Step E — Lightweight performance smoke (03:00)

- Preferred: k6 smoke profile (`test:load:smoke`)
- If k6 unavailable: run fallback verification suite (`performance-load-testing-wave1403`)
- Track latency/failure trend vs prior night

### Step F — DR readiness sanity (04:00)

- Run DR dry-run verification (`dr-verify --dry-run --json`)
- Validate result artifact/report emission
- If `mongorestore` missing, mark as blocker and escalate (severity: medium)

### Step G — End-of-window summary (04:30-05:00)

- Record pass/fail status for each step
- Open incident ticket for any blocker persisting >2 nights
- Publish brief summary to Ops channel

## 3) Alerting & Escalation Rules

- **Critical (P1):** backend down, DB unavailable, backup corruption
- **High (P2):** backup missing >24h, DR verify failing repeatedly
- **Medium (P3):** load smoke unavailable due tooling/runtime gap
- **Low (P4):** documentation drift or non-blocking warnings

Escalation path:

1. On-call engineer
2. Platform lead
3. Release owner (if impacts go-live decision)

## 4) Exit Criteria (Nightly Green)

All conditions below must be true:

- Backend/API health checks pass
- Latest backup exists and retention policy intact
- No unresolved critical sweeper failures
- DR dry-run succeeds or has an approved temporary exception
- Performance smoke executed (or approved fallback)

## 5) Current Known Gaps (as of 2026-06-17)

No open gaps in this cycle after:

- passing full DR verification (`dr-verify --json`), and
- passing authenticated gov-load profile (`k6 ... -e TOKEN=...`).
