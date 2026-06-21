# Performance Load Testing

<!-- W1401-W1403 load-testing runbook -->

**Purpose:** Verify that the Al-Awael ERP backend meets its SLO budgets under
synthetic load before releases and after infrastructure changes.

**Owner:** Platform / QA Team  
**Frequency:** Before every production release + weekly scheduled run  
**Runbook Chain:** [CI workflow](../.github/workflows/load-testing.yml)

## Quick Start

```bash
cd backend
npm run test:load:smoke
npm run test:load
npm run test:load:gov
```

Override defaults from the CLI:

```bash
BASE_URL=https://staging-api.example.com TOKEN=<jwt> PEAK_VUS=100 PEAK_DURATION=2m npm run test:load
```

## Profile 1: Smoke Test (`k6-smoke.js`)

Light, fast probe used as a gate before heavier runs.

```bash
npm run test:load:smoke
```

- 1 virtual user for a few iterations
- Hits `/health`
- No SLO thresholds (informational only)

## Profile 2: Baseline Load Test (`k6-load.js`)

Steady-state load profile with a 5-stage ramp.

```bash
npm run test:load
```

Stages:

1. Warm-up: `30s`
2. Climb: `30s`
3. Reach peak: `30s`
4. Sustain: configurable (`PEAK_DURATION`, default `1m`)
5. Ramp-down: `30s`, target `0`

SLO budgets:

| Metric              | Budget      |
| ------------------- | ----------- |
| `http_req_failed`   | < 1%        |
| `health_latency`    | p95 < 300ms |
| `readiness_latency` | p95 < 300ms |

## Profile 3: Government Integration (`k6-gov-integrations.js`)

Read-only probes against government adapter endpoints.

```bash
npm run test:load:gov
```

SLO budgets:

| Metric                | Budget       |
| --------------------- | ------------ |
| `http_req_failed`     | < 1%         |
| `nphies_read_latency` | p95 < 1200ms |
| `gosi_read_latency`   | p95 < 1500ms |
| `gov_read_failed`     | < 0.5%       |

## CI Integration

The `.github/workflows/load-testing.yml` workflow runs the smoke test on every
push to `main`, the baseline test weekly, and the government integration test
on demand. Production load testing is **DISABLED** in CI.

## Troubleshooting

- If k6 is not installed, install it globally or use the Docker image.
- If `BASE_URL` is unreachable, check VPN / network allowlisting.
- If p95 latency exceeds budget, inspect database indexes and connection pools.

## Maintenance

Keep this runbook in sync with the k6 files under `backend/tests/load/` and the
SLO budgets in the source files. W1401.
