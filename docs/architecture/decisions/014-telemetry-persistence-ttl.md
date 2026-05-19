# 14. Telemetry Persistence with Mongo TTL (Hybrid In-Memory + Persistent)

Date: 2026-05-19

## Status

✅ Accepted (Wave 134)

## Context

Wave 128 + 131 shipped in-memory LLM telemetry: rolling buffer per service,
bounded by both time (7-day window) and count (10K records max). This works
for sub-hour ops queries — "what's the chatbot doing right now" — but has
two limitations:

1. **Restart loses everything.** A pod restart blanks the buffer; the
   ops dashboard reads zero until traffic accumulates.
2. **Can't query beyond the 7-day window.** Anthropic invoices arrive
   monthly; reconciling cost against actual usage requires multi-week
   data that the in-memory buffer doesn't keep.

Naive fix: increase `windowMs` to 30+ days. Bad — buffer would grow
unbounded (a busy chatbot at 10K req/day fills the buffer in a day
regardless of windowMs).

## Decision

Hybrid storage in Wave 134:

1. **In-memory rolling buffer stays unchanged** (fast path for sub-hour
   queries; no DB hit). Wave 128 API surface preserved.

2. **New Mongoose model `LlmTelemetryCall`** — append-only persistent
   record per call:

   - Schema: `at` (indexed), `serviceName` (indexed), `source`, `intent`,
     `tokensIn`, `tokensOut`, `elapsedMs`, `success`, `reason`,
     `costUsd` (snapshot at write-time).
   - **TTL index on `at` with `expireAfterSeconds: 30 * 24 * 60 * 60`** —
     Mongo's TTL monitor deletes rows older than 30 days. Aligns with
     PDPL retention defaults.
   - Compound indexes: `(serviceName, at desc)` for per-service queries
     - `(serviceName, reason, at desc)` for "all TIMEOUT failures last
       week" type queries.
   - **No `timestamps: true`** — `at` IS the canonical time. Saves ~30
     bytes/row across millions of records.

3. **`createLlmTelemetry` accepts optional `{persistModel, serviceName, logger}`.**
   When provided, every `recordCall` ALSO writes to the model via
   `Model.create(doc)` — **fire-and-forget, with `.catch()` warn-log**.
   Persist failure NEVER blocks in-memory recording or the LLM response.

4. **Cost snapshot stored at write-time.** The `costUsd` column captures
   `(tokensIn × inputRate + tokensOut × outputRate) / 1M` using the per-service
   rates active when the call happened. Re-priced totals can be recomputed
   from tokens if rates change, but the snapshot keeps each row self-contained
   for invoice reconciliation.

5. **`getPersistedTelemetry({since, until, bucketHours})`** queries the
   model + returns the SAME shape as in-memory `getTelemetry()`. Caller
   chooses by horizon: in-memory for <1h, persistent for >7d.

6. **Route exposes `?source=memory|persisted`** — operator-controlled.
   The Wave 137 dashboard toggles between modes.

7. **`Model.create` over `new Model().save()`** — Mongoose 9.x had thenable
   bugs around freshly constructed documents (chained `.then` could confuse
   promise resolution). `Model.create(doc)` returns a clean promise.

## Consequences

**Easier:**

- Operator dashboards can show 30-day cost trends without keeping 30 days
  of in-memory data.
- Anthropic invoice reconciliation: query `LlmTelemetryCall` for the billing
  period + sum `costUsd` per service.
- Restart-survival: a pod restart loses in-memory buffer but persistent
  rows remain.
- BI/dashboard export: standard Mongo collection, no in-memory protocol
  to learn.

**Harder:**

- Every LLM call now incurs ONE async DB write per recorded outcome.
  Fire-and-forget keeps it off the critical path, but high-traffic
  services should monitor write latency separately.
- Schema migrations on `LlmTelemetryCall` require care because TTL is
  in flight — Mongo's TTL monitor doesn't wait for schema changes.

**Tradeoffs:**

- **PDPL**: 30-day TTL is the explicit retention. Cost data is exec-only
  (perm `ai.telemetry.read`); no PII / PHI in the schema (prompt content
  is never persisted, by design — the forbidden-content guard from
  Wave 122 keeps it out of templates too).
- **Cost snapshot vs. derived**: snapshot wins for invoice reconciliation
  (frozen rates) but loses for retroactive re-pricing. We accept that
  retroactive re-pricing requires the token columns + a recompute, not
  a simple `SUM(costUsd)` — explicitly documented as "approximation,
  reconcile against Anthropic invoices for billing-grade accuracy".

## References

- Wave 134 implementation (absorbed into commit `ebccd3ec6`)
- Wave 128 in-memory baseline (ADR 013)
- ADR 015 — Forbidden-content guard prevents PHI from reaching the
  schema in the first place
