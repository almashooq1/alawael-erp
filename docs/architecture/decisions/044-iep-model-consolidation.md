# ADR-044 — IEP/IFSP model boundary: keep `IndividualEducationPlan` canonical, position `SmartIEP` as the smart-suggestion tier (🟡 PROPOSED)

> **🟡 PROPOSAL (2026-06-21, repair-all-defects discovery)** — Do NOT force-merge the two IEP models. Treat `IndividualEducationPlan` as the canonical, legally-binding MoE plan and `SmartIEP` as a goals-bank / smart-suggestion assistant that may feed into it.
>
> **Net:** the duplication is real, but a blind merge would either (a) lose the MoE-mandated IEP/IFSP structure or (b) lose the AI-assisted goals-bank capabilities. The right fix is documented boundaries + a bridge, not a destructive consolidation.

**Date**: 2026-06-21  
**Type**: ADR (model consolidation / canonical-entity)  
**Mode**: 👤 stakeholder must sign off on Option B vs. C; Claude can implement the boundary guard + deprecation markers once chosen  
**Decider**: Clinical/education lead (IEP workflow owner) + backend owner (model canonicalization)  
**Effort**: guard + deprecation markers ≈ 1 day; full migration ≈ 1–2 weeks if Option C is chosen  
**Related**: ADR-040 (goal-model consolidation), ADR-026 (IEP/IFSP/CarePlan fragmentation), repair-all-defects P1-2

## Context

Two Mongoose models represent an **Individualized Education / Family Service Plan**:

| Model                       | Registered / file                                                              | Scope                                                                             | Key capabilities                                                                                    | Live callers                         |
| --------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **`IndividualEducationPlan`** | [`models/IndividualEducationPlan.js`](../../../backend/models/IndividualEducationPlan.js) | Canonical MoE-mandated IEP/IFSP for school-age and 0–3 early intervention         | Plan-year uniqueness, status workflow, signatures, nested goals/services, goal↔TherapeuticGoal bridge | `/api/iep/*` routes                  |
| **`SmartIEP`**                | [`models/SmartIEP.js`](../../../backend/models/SmartIEP.js)                               | AI-assisted / smart goals-bank IEP with domains, disability types, performance levels | Goals bank, SMART goal generation, suggested objectives, PECS-style goal scaffolding                  | `/api/smart-iep/*` registry route    |

Both have live routes and different shapes. They are **not byte-for-byte duplicates**; they are divergent verticals that happened to be named similarly.

## Decision drivers

1. **Regulatory compliance** — the MoE-required IEP/IFSP structure and signature workflow must not be disrupted.
2. **Don't strand built functionality** — `SmartIEP`'s goals bank and SMART engine have value for therapists.
3. **Single source of truth for the legally-binding plan** — there must be exactly one canonical IEP document per beneficiary/planYear.
4. **Avoid destructive data migration until Q1–Q4 are answered** — neither model is provably unused in production.

## Options

| Option | Description | Pros | Cons | Verdict |
| ------ | ----------- | ---- | ---- | ------- |
| **A — Merge SmartIEP into IndividualEducationPlan** | Absorb `SmartIEP` fields/capabilities into the canonical model and retire `SmartIEP`. | One model, one collection, one route family. | High risk: data shape mismatch, loss of goals-bank metadata, breaking both `/iep` and `/smart-iep` UIs, lengthy migration. | ❌ REJECTED without stakeholder data audit |
| **B — Keep both with documented boundaries + bridge** | `IndividualEducationPlan` = canonical MoE plan; `SmartIEP` = suggestion/goals-bank tier. Add a `suggestedBySmartIepId` or `goalBankSource` bridge; smart goals can be imported into the canonical plan. | Preserves both capabilities; non-destructive; aligns with ADR-040 tiering pattern. | Still two collections; requires UI work to expose "import from SmartIEP". | 🟡 PROPOSED |
| **C — Deprecate SmartIEP and migrate goals bank to a service** | Move the smart-suggestion logic into a pure service/helper that populates `IndividualEducationPlan` goals; retire `SmartIEP` model once data is migrated. | Cleaner long-term; removes model duplication. | Requires data migration + UI changes + verifying no live SmartIEP docs. | 🟡 ALTERNATIVE (stakeholder call) |

## Proposal (Option B)

1. **`IndividualEducationPlan` is canonical.** All legally-binding IEP/IFSP operations use it.
2. **`SmartIEP` is repositioned** as a *smart goals-bank / suggestion assistant*. It never becomes the legal plan.
3. **Add a bridge** so goals suggested by `SmartIEP` can be imported into `IndividualEducationPlan` (e.g., `Goal.suggestedBySmartIepGoalId`).
4. **Add `@deprecated` markers** to any `SmartIEP` fields/routes that overlap with the canonical model.
5. **Add a drift guard** that fails CI if a third IEP-like model is registered.

## Open questions (blockers)

- Q1: Are there live `SmartIEP` documents in production?
- Q2: Does any downstream report or integration treat `SmartIEP` as the canonical IEP?
- Q3: Should the smart-goals-bank capability be moved to a service (Option C) instead?
- Q4: Which UI surface(s) consume `/api/smart-iep/*`?

## Consequences

- **Good:** clear canonical model; no data migration risk; preserves AI-assisted goal generation.
- **Bad:** two collections remain until Option C is funded.
- **Guard:** `__tests__/iep-model-drift-waveXXXX.test.js` — assert exactly 2 IEP-like models (`IndividualEducationPlan`, `SmartIEP`) are registered; fail on any third.
