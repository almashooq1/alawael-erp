# Runbook — Gov adapter rate limit saturated

**Alerts:** `GovAdapterRateLimitHigh` (warning) / `GovAdapterRateLimitExhausted` (critical)
**Metric:** `gov_adapter_rate_limit_utilization_percent{provider="X"}`
**Triggered by:**

- `High`: `>85%` sustained for 5 minutes
- `Exhausted`: `>=100%` sustained for 2 minutes (calls now returning HTTP 429)

## What this means in plain Arabic

مستوى استخدام حصة الاستدعاء لدى مزوّد X عالٍ. الحصة محلية (token-bucket per provider) — ليست تلك التي يفرضها المزوّد نفسه. هدفها حماية ميزانية التكلفة من استدعاءات ضائعة (cron loop، تكرار طلبات مستخدم، إلخ). عند 100% يعيد الـ API رمز 429 مع `retryAfterMs`.

## Who should respond

On-call engineer. This is rarely an upstream issue — usually code or a
user behaving unexpectedly.

## Immediate actions (2 minutes)

1. Open `/admin/rate-limits` — confirm which provider is saturated and
   the actor count (`activeActors`). If actors is very high, it's a
   legitimate spike; if it's 1–2, someone's in a loop.
2. Check `/admin/adapter-audit?provider=X&limit=100` — look at the
   `actorEmail` distribution over the last hour. One actor doing 50+
   calls is suspect.
3. Check Prometheus `gov_adapter_calls_total{provider="X"}` trend. If
   the rate shot up in the last 10 minutes coincident with a deploy,
   the deploy is the cause.

## Diagnosis path

### Case A: runaway cron / background job

- Check the backend logs for repeated `[compliance] X verified` events
  for the same employee/beneficiary.
- Common culprit: a re-verification cron missing a dedupe guard.
- Fix: stop the offending worker (PM2 / systemd), verify audit volume
  drops, deploy the fix, restart. Don't raise the rate limit.

### Case B: legitimate spike (onboarding batch, migration)

- If this is expected (e.g. HR importing 500 new employees and the
  onboarding flow verifies each):
  - Raise the cap via env: `{PROVIDER}_RL_CAPACITY=200`,
    `{PROVIDER}_RL_REFILL_PER_MIN=120` and redeploy.
  - Document the new cap in the go-live doc + commit the change.
- If unexpected, find the actor (`actorEmail`) and ask them what
  they're doing.

### Case C: single noisy actor (per-actor cap hit)

- Metric `gov_adapter_rate_limit_active_actors` shows distinct actors.
  If it's 1–2 but utilization is high, a single actor is saturating
  their per-actor cap (`actorCap` default 20/min).
- Usually a misbehaving client (tab left open with polling bug,
  webhook loop).
- Fix: revoke their token + contact them. The breaker rejects further
  calls automatically.

### Case D: capacity misconfiguration after a deploy

- If the alert fired immediately after a deploy, check if an env var
  was wiped: `env | grep _RL_CAPACITY`.
- Restore via k8s secret or env file and redeploy. `POST
/admin/gov-integrations/rate-limits/X/reset` to clear the bucket
  and let fresh tokens flow.

## Preventing recurrence

- **Never silently raise caps to mask a runaway.** The rate limiter
  is a cost-budget guardrail; bypassing it can burn thousands of SAR
  on Absher/NPHIES.
- **Add dedupe to any re-verification cron.** Only verify if
  `lastVerifiedAt` is older than 24h.
- **Use `skipRateLimit: true`** in `audit.wrap()` ONLY for admin
  test-connection pings. Never for user-driven flows.
- Add a Grafana panel for `rate(gov_adapter_calls_total[5m]) by actor`
  if actor-level visibility is needed (requires extending the metrics
  registry to emit per-actor labels — off by default for cardinality
  reasons).

## Related

- Source: `backend/services/adapterRateLimiter.js`
- Wiring: `backend/services/adapterAuditLogger.js::wrap()` (checks
  rate limit before calling the adapter)
- Env tunables: `{PROVIDER}_RL_CAPACITY`, `{PROVIDER}_RL_REFILL_PER_MIN`,
  `{PROVIDER}_RL_ACTOR_CAP`
- Admin reset: `POST /api/admin/gov-integrations/rate-limits/:provider/reset`
- UI: `/admin/rate-limits` (per-provider cards) · `/admin/integrations-ops`
  (util column in matrix)
