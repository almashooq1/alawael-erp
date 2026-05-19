# 11. Heuristic-First Predictions; ML Optional Behind the Same Contract

Date: 2026-05-18

## Status

✅ Accepted (Wave 115; reaffirmed Wave 117, Wave 123)

## Context

P3 (Intelligence & Automation) calls for several prediction services:
no-show prediction (P3.4), schedule optimization (P3.5), parent chatbot intent
classification (P3.6). The "obvious" approach for each is an external ML
service (Python sklearn, hosted endpoint, custom training pipeline).

But: external ML adds operational complexity (separate deploy, auth,
versioning, training data lifecycle, model drift detection) AND blocks
shipping until the ML side is built. For a healthcare ERP that's still
proving the user-side value of each prediction, this is the wrong tradeoff.

The pre-existing `progressPrediction.service.js` (Prompt-20 era) had this
problem: it called `ML_SERVICE_URL` and fell back to rule-based scoring when
unreachable. The fallback ran in 100% of production (no ML service deployed)
but the architecture pretended ML was primary. Telemetry didn't exist; nobody
knew the model was running rules.

## Decision

For every P3 prediction:

1. **Ship a rule-based scorer FIRST.** Pure functions (`extractFeatures`,
   `scoreFromFeatures`) — deterministic, testable, no external dependency.
   Score in [0, 1] with documented per-feature weights.

2. **Define the public contract on the rule-based implementation.** The
   service exposes `predictX(input)` returning `{score, band, contributions}`.
   Callers depend on the contract, not the implementation.

3. **ML is an OPTIONAL OPTIMIZATION** that slots in behind the same contract
   when the data + tooling justify it. The rule-based version stays as the
   FALLBACK when the ML side is unreachable.

4. **Cost defaults belong to the service, not the lib.** Per Wave 128, each
   LLM-backed service passes its own model's pricing — the shared lib stays
   model-agnostic.

This applies to:

- **Wave 115 No-Show Prediction**: 9 weighted features, 4 bands, 6 intervention tiers — no ML
- **Wave 117 Schedule Optimizer V2**: compose risk-aware enrichment over V1 greedy — no ML
- **Wave 123 Parent Chatbot Classifier**: LLM is primary HERE (different from above) but rule-based stays as silent fallback so the bot works offline
- **Wave 118 Progress Prediction**: validates the pre-existing rule-based fallback path that was running 100% of the time

## Consequences

**Easier:**

- Ship value in one wave instead of waiting for ML pipelines.
- Rule-based code is testable WITHOUT mocking external services.
- Operators can audit decisions — every feature's contribution is documented.
- The fallback path is the SAME code path that runs in dev/CI/demo
  environments without API keys.

**Harder:**

- Rule weights are guesses until production data validates them. Operators
  must tune from real data (Wave 134 telemetry persistence makes this
  possible across multi-week windows).
- The "rules are good enough" position requires honest measurement —
  Wave 134's `actual_value` validation (no-show: COMPLETED→0, NO_SHOW→1,
  CANCELLED→0.5) tracks accuracy. If it drops below ~70%, ML upgrade is
  warranted.

**Tradeoffs:**

- The team forgoes potential ML accuracy gains for development speed +
  operational simplicity. Acceptable because the prediction outputs drive
  HUMAN interventions (extra reminders, schedule swaps, agent escalations),
  not autonomous decisions — false positives cost a phone call, not a
  patient outcome.

## References

- Wave 115 No-Show Prediction
- Wave 117 Schedule Optimizer V2
- Wave 118 Progress Prediction validation
- Wave 123 Parent Chatbot LLM-with-rule-fallback (related; see ADR 012)
