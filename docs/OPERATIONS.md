# Operations — quick reference

One-page index for running Al-Awael in production. Every link in here
points at a more detailed doc; this page is for the operator who
needs an answer in <30 seconds.

---

## Health check hierarchy

Pick the level that fits what you're asking:

| Question                              | Surface                                | Auth  |
| ------------------------------------- | -------------------------------------- | ----- |
| "Is the process alive?"               | `GET /health`                          | no    |
| "Are all 10 gov adapters configured?" | `GET /api/health/integrations/summary` | no    |
| "What's the state of each adapter?"   | `GET /api/health/integrations`         | no    |
| "Feed me Prometheus data"             | `GET /api/health/metrics/integrations` | no    |
| "Is anything drifting?" (human view)  | `/admin/integrations-ops` (web UI)     | admin |
| "Full state including PDPL trail"     | `/admin/adapter-audit`                 | admin |
| "CLI snapshot for cron/SSH"           | `npm run gov:status` (exit 0/1/2)      | shell |
| "Which commit is serving this?"       | `GET /api/build-info`                  | no    |

---

## Common incident paths

| Symptom                                    | Go here first                                                         |
| ------------------------------------------ | --------------------------------------------------------------------- |
| Alert: `GovAdapterCircuitOpen`             | [gov-adapter-circuit.md](runbooks/gov-adapter-circuit.md)             |
| Alert: `GovAdapterRateLimit*`              | [gov-adapter-rate-limit.md](runbooks/gov-adapter-rate-limit.md)       |
| Alert: `GovAdapterMisconfigured`           | [gov-adapter-misconfigured.md](runbooks/gov-adapter-misconfigured.md) |
| Parent complaining "app says busy/429"     | Check `/admin/rate-limits` — likely a runaway cron                    |
| DPO asks "what did user X access?"         | `/admin/adapter-audit?actorEmail=X` → CSV export                      |
| "Compliance wants full trace of request Y" | `/admin/adapter-audit/by-correlation/Y`                               |

---

## Deploying a gov-integration flip

Going mock → live for any of the 10 Saudi providers:

1. Confirm contract + credentials in hand (see
   [GOV_INTEGRATIONS_GO_LIVE.md](sprints/GOV_INTEGRATIONS_GO_LIVE.md)
   § _Pre-requisites_).
2. Set the env vars (see `backend/.env.example` — every `{PROVIDER}_*`
   block is documented inline with sensible defaults).
3. **Run preflight**: `cd backend && npm run preflight`. Exits 0 if
   every `*_MODE=live` adapter has its full env var set; exits 1 with
   a per-provider missing-vars list otherwise. Wire this into k8s
   initContainer / Dockerfile / CI deploy gate so the app never
   boots half-configured.
4. `POST /api/admin/gov-integrations/:provider/test-connection` before
   flipping traffic. Must return `ok: true`.
5. Set `{PROVIDER}_MODE=live` and redeploy.
6. Watch `/admin/integrations-ops` for the first 5 minutes — the card
   should show `mode: live` and `configured: true`.
7. If anything looks wrong, flip back: `{PROVIDER}_MODE=mock` and redeploy.
   Mock mode takes over immediately.

---

## Rate limits — who owns the knob

| Env var                        | Effect                                         |
| ------------------------------ | ---------------------------------------------- |
| `{PROVIDER}_RL_CAPACITY`       | Token-bucket size (default per provider)       |
| `{PROVIDER}_RL_REFILL_PER_MIN` | Tokens added per minute                        |
| `{PROVIDER}_RL_ACTOR_CAP`      | Max calls per actor per rolling 60s            |
| `{PROVIDER}_MAX_FAILURES`      | Circuit breaker trip threshold (paid adapters) |
| `{PROVIDER}_COOLDOWN_MS`       | Circuit breaker open duration                  |

Defaults tuned to vendor tiers in `backend/services/adapterRateLimiter.js`
(GOSI 60/30/20, Absher 30/10/5, NPHIES 120/60/30, Fatoora 600/600/200).

**Never raise a cap to mask a runaway.** See
[gov-adapter-rate-limit.md](runbooks/gov-adapter-rate-limit.md) §
_Preventing recurrence_.

---

## Prometheus + Grafana

- Scrape target: `/api/health/metrics/integrations` every 30s, no auth.
- Import [dashboards/gov-integrations.grafana.json](dashboards/gov-integrations.grafana.json)
  (Grafana 10.x, 12 panels).
- Load [alerts/gov-integrations.yml](alerts/gov-integrations.yml) into
  Prometheus `rule_files`. Wire Alertmanager routes for
  `severity=critical` → PagerDuty, `severity=warning` → `#ops` Slack.

Key SLI queries (PromQL):

```promql
# 5-minute success rate per provider
sum by (provider) (rate(gov_adapter_calls_total{status="success"}[5m]))
  /
sum by (provider) (rate(gov_adapter_calls_total[5m]))

# p95 latency per provider
histogram_quantile(0.95,
  sum by (le, provider) (rate(gov_adapter_call_latency_ms_bucket[5m])))

# Max rate-limit pressure over the last hour
max_over_time(gov_adapter_rate_limit_utilization_percent[1h])
```

---

## Emergency reset — circuit / rate limit

Operator-only. Use only after verifying the underlying cause is gone.

```bash
# Force-close a circuit
curl -X POST $BASE/api/admin/gov-integrations/circuits/gosi/reset \
     -H "Authorization: Bearer $ADMIN_JWT"

# Force-refill a rate-limit bucket
curl -X POST $BASE/api/admin/gov-integrations/rate-limits/gosi/reset \
     -H "Authorization: Bearer $ADMIN_JWT"
```

UI equivalents in `/admin/integrations-ops` and `/admin/rate-limits`.

---

## Pre-push opt-in gate

Not enforced in husky (would slow routine docs/test edits). But
before pushing anything that touches `backend/services/*`,
`backend/routes/*-integrations*`, or `docs/alerts|dashboards|runbooks/*`,
run:

```bash
make ship-check          # or: npm run ship-check
```

~90 seconds. Runs `preflight` + `test:ops-subsystems`. Exits non-zero
if either fails — that's your signal to fix before pushing.

---

## Related docs

- [CHANGELOG.md](../CHANGELOG.md) — release history (4.0.x covers all ops work)
- [DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md) — general deploy sequence
- [sprints/GOV_INTEGRATIONS_GO_LIVE.md](sprints/GOV_INTEGRATIONS_GO_LIVE.md) — per-provider checklist
- [runbooks/README.md](runbooks/README.md) — full runbook index
