# Runbook — Gov adapter circuit breaker is OPEN

**Alert:** `GovAdapterCircuitOpen` (severity: critical)
**Metric:** `gov_adapter_circuit_open{provider="X"} == 1`
**Triggered by:** 5 consecutive failures within a 60s rolling window against provider X's live endpoint.

## What this means in plain Arabic

دائرة الحماية (circuit breaker) لمزوّد X فُتِحَت. طلبات `verify` لهذا المزوّد سترجع `status: unknown` تلقائيًا لمدة 120 ثانية (القيمة الافتراضية) حتى تُغلَق الدائرة مجدّدًا عند أول نجاح. هذه آلية حماية — ليست خطأ برمجي عندنا؛ المزوّد نفسه لا يستجيب.

## Who should respond

On-call engineer (platform). Escalate to the integration owner if not resolved in 30 minutes.

## Immediate actions (2 minutes)

1. Open the ops dashboard: **`/admin/integrations-ops`**. Confirm the circuit chip shows "مفتوحة" with a cooldown countdown.
2. Check **`/admin/adapter-audit`** filtered by provider=X and success=false for the last 10 minutes. Look at `errorMessage` — is it:
   - `HTTP 5xx` → upstream is down (their fault)
   - `AbortError` / `ECONNRESET` → network blip (shared infra)
   - `NOT_CONFIGURED` → someone broke our env vars
   - `HTTP 401` → their token rotation failed → see step 3
3. Verify Prometheus metric `gov_adapter_circuit_failures{provider="X"}` — if it's exactly 5 and climbing, we're mid-incident; if stuck at 5 with cooldown elapsed, go to step 4.

## Diagnosis path

### Case A: upstream is genuinely down

Check the provider's own status page:

| Provider        | Status page              |
| --------------- | ------------------------ |
| GOSI            | https://www.gosi.gov.sa/ |
| Absher / Yakeen | https://www.absher.sa/   |
| NPHIES          | https://nphies.sa/       |
| Fatoora / ZATCA | https://zatca.gov.sa/    |

If the provider's status page shows an outage:

- **Do nothing to the code.** The breaker is doing its job — hammering a down service wastes our cost budget.
- Post in `#incidents` with link to provider status.
- Users will see the `circuitOpen: true` fallback. For compliance-critical flows (HR verification during onboarding), flag to the business owner.
- Wait for the provider to recover. Our breaker will auto-close on the first success.

### Case B: network blip or transient DNS

- Cooldown is 120s by default. If you're confident the blip is over (e.g., you can reach the provider's URL from the app host), force-close:
  - UI: click the ↻ icon next to the circuit chip in `/admin/integrations-ops`
  - API: `POST /api/admin/gov-integrations/circuits/X/reset` with an admin JWT
- If failures resume immediately after reset → escalate to Case A.

### Case C: misconfiguration

- Check `/api/admin/gov-integrations/status` for `missing: [...]` entries.
- Common culprits after a deploy:
  - `XXXX_BASE_URL` pointing at staging after a rollback
  - `XXXX_CLIENT_SECRET` rotated upstream but not updated in our env
- Fix env vars → redeploy → `POST .../circuits/X/reset` to clear the failure history.

### Case D: 401 storm (token rotation failed)

- GOSI/NPHIES/Absher rotate OAuth creds periodically. Our adapter caches tokens with a 10s pre-expiry buffer.
- If upstream invalidated the token early, we'll retry with `force=true` once, then the circuit trips on the 2nd+ attempt.
- Fix: rotate the client secret in env; deploy; `POST .../circuits/X/reset`.

## Preventing recurrence

- **Raise `XXXX_MAX_FAILURES`** only if you've convinced yourself the provider has genuinely flaky ops — this masks real incidents.
- **Raise `XXXX_COOLDOWN_MS`** if upstream recovery is consistently >2 minutes. Don't go below 60s.
- **Lower `XXXX_FAILURE_WINDOW_MS`** (default 60s) only if the provider fails in short bursts separated by minutes of calm.
- Do NOT bypass the breaker with a feature flag. If we trust their ops, we should be using SLOs, not circuit breakers.

## Related

- Source: `backend/services/adapterCircuitBreaker.js`
- Wiring: each adapter's `liveVerify` / `liveSubmit` path
- Metrics: `gov_adapter_circuit_open{provider}`, `gov_adapter_circuit_failures{provider}`, `gov_adapter_circuit_cooldown_ms{provider}`
- Admin reset: `POST /api/admin/gov-integrations/circuits/:provider/reset`
- UI: `/admin/integrations-ops` (provider matrix, circuit column)
