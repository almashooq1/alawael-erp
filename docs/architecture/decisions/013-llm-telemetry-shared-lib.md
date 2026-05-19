# 13. Shared LLM Telemetry Library + Cross-Service Registry

Date: 2026-05-19

## Status

✅ Accepted (Wave 128 + Wave 131)

## Context

Wave 126 shipped in-memory telemetry inline in `parent-chatbot-llm.service.js`:
rolling buffer, per-source aggregation (`llm` / `cache` / `reject` / `failure`),
hourly bucketing, cost calc. The implementation was ~250 lines embedded in the
chatbot service.

After Wave 126, **the same pattern would have been re-implemented** for the
care-plan LLM caller (Wave 48, in production but with no telemetry). And
again for whatever LLM service ships next. Three copies of the same buffer +
pruning + aggregation logic would drift; the Anti-Duplication detector
(Wave 93) would not catch it because each copy would have a different name.

There was also no way to answer "what's the total LLM spend this week across
all services?" without manually walking each service's `getTelemetry()` and
summing.

## Decision

Two-tier extraction in Waves 128 + 131:

1. **Wave 128: `intelligence/llm-telemetry.lib.js`** — pure factory:
   `createLlmTelemetry({windowMs, maxCalls, inputUsdPer1M, outputUsdPer1M, now})`
   → `{recordCall, getTelemetry, reset, size}`.

   - Each service owns its OWN buffer (no singleton sharing).
   - Cost defaults to Haiku 4.5; services pass their model's pricing.
   - Source enum (`'llm'|'cache'|'reject'|'unknown'`) is the documented
     vocabulary; services must record every exit path.
   - Wave 134 adds `persistModel` + `serviceName` params for Mongo TTL
     storage (see ADR 014).

2. **Wave 131: `intelligence/llm-registry.lib.js`** — process-wide
   registry of LLM services that expose `getTelemetry()`:

   - `getDefaultRegistry()` singleton + `createLlmRegistry()` for tests.
   - `getAllTelemetry()` fans out + merges per-service totals + computes
     cross-service rates.
   - **Error isolation**: a service throwing in `getTelemetry()` becomes
     `{ok:false, reason:'TELEMETRY_THREW'}` in its registry slot; the
     rest still aggregate.
   - **avgLatencyMs is call-count-weighted** across services so a noisy
     low-volume service doesn't skew the cross-service number.
   - Bucket merging is NOT attempted (per-service timestamps may differ);
     UI displays per-service buckets side-by-side.

3. **Bootstrap-side registration** (Wave 131): `app.js` registers the
   chatbot LLM after construction; `care-plan-bootstrap.js` registers
   the care-plan LLM the same way. Both wrap registration in try/catch
   so registry plumbing failures NEVER block the LLM service from booting.

4. **Permission**: `ai.telemetry.read` is narrower than `admin.chatbot.read`
   (exec + DPO + audit only) because token-by-token cost data is
   exec-visibility, not therapist-visibility.

## Consequences

**Easier:**

- Adding telemetry to a new LLM service: import the lib, pass it model
  pricing, record on every exit. ~5 lines of integration.
- Cross-service dashboard: one route (`/api/v1/ai/llm-telemetry`) covers
  every service registered at boot. UI inherits new services for free.
- Cost reconciliation against Anthropic invoices: single merged total +
  per-service breakdown.

**Harder:**

- Future telemetry features (percentiles, anomaly alerts, retention >30d)
  must extend the SHARED lib, not branch per service. The cost of
  centralization is coordination on extensions.
- Race condition in service registration: parallel agent commits absorbed
  Waves 131 + 134 because the staged file set spanned the cross-service
  changes. Mitigation: atomic `git add ... && git commit` in one shell
  command (see ADR 016).

**Tradeoffs:**

- Pure factories instead of a global singleton give per-test isolation
  (good) at the cost of one extra parameter per service (acceptable).
- Latency-weighted averaging assumes per-service call counts are comparable
  in magnitude; a 100K/day service vs. a 10/day service still gets weighted
  correctly because we use _raw_ call counts, not normalized rates.

## References

- Wave 126 in-line implementation (commit `df7d84701`)
- Wave 128 extraction (commit `e7cf2e311`)
- Wave 131 cross-service registry (absorbed into commit `3951455c8`)
- Wave 134 telemetry persistence (ADR 014)
- Wave 137 admin UI (commit `263b830`)
