# Go-Live Checklist

> Operational checklist to run **immediately before and during** a production
> go-live (or a major release). Every box is an action to perform — none are
> pre-checked. Do not deploy with unchecked **blocking** items.
>
> Related: [pre-deployment-checklist.md](pre-deployment-checklist.md) ·
> [env-preflight-check.md](env-preflight-check.md) ·
> [environment-setup.md](environment-setup.md) ·
> [go-live-deployment-plan-w1404.md](go-live-deployment-plan-w1404.md) ·
> [SECURITY.md](../../SECURITY.md)

## 1. Pre-flight (blocking)

```bash
# Environment is complete (strict-required keys present + non-blank)
NODE_ENV=production CI=true npm run env:check     # must exit 0

# Static drift gates
npm run check:routes-load
npm run check:sprint-paths

# Full deploy gate (mirrors the CI sharded Run Tests job)
npm run preflight
```

- [ ] `npm run env:check` exits 0 in the target environment
- [ ] All pre-push gates green (`routes-load`, `sprint-paths`, `wave-collision`, `phantom-writes`)
- [ ] Latest `main` deploy run is green (GitHub Actions → 🚀 Deploy to Production)
- [ ] Secrets cutover completed/verified — see `production-secrets-cutover-*-w1406.md`

## 2. Data & backups (blocking)

- [ ] Fresh database backup taken within the last 24h (`npm run db:backup`)
- [ ] Backup restore rehearsed at least once (`dr-verify.js` — **never against prod**)
- [ ] Rollback plan written and the previous release tag/commit recorded

## 3. Monitoring & alerting

- [ ] Prometheus scraping the app `/metrics` endpoint (`ops/prometheus.yml`)
- [ ] AlertManager receivers reachable (`ops/alertmanager.yml` — Slack/PagerDuty)
- [ ] Alerting rules loaded (`ops/alerting-rules.yml`, incl. NPHIES/ZATCA)
- [ ] Grafana dashboard renders (`ops/grafana/provisioning/dashboards/alawael-dashboard.json`)

## 4. Communications

- [ ] Ops/on-call notified (Slack `#deployments`) with the go-live window
- [ ] Stakeholders informed per `go-live-communication-templates-w1405.md`
- [ ] On-call owner confirmed for the first 24h

## 5. Cutover

- [ ] Deploy merged to `main` (auto-deploy) **or** manual deploy executed
- [ ] Health endpoint returns 200 (`/api/v1/health`)
- [ ] Post-deploy smoke checks pass
- [ ] Spot-check a critical user journey (login → core surface)

## 6. Post-go-live (first 24h)

- [ ] Watch error rate + latency dashboards (no sustained alerts firing)
- [ ] Confirm scheduled jobs/sweepers ran on their first tick
- [ ] Capture any incidents + file follow-ups
- [ ] Record outcome in the go-live final report

---

**Guarded by:** `backend/__tests__/runbooks-referenced.test.js` (must be linked
from the runbook index). **Version:** 1.0.0 (W1410).
