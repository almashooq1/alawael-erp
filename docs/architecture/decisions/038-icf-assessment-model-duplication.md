# ADR-038 — Resolve the ICF assessment-model duplication (`IcfAssessment` route-local vs `ICFAssessment` rich service) (🟡 Proposed)

**Date**: 2026-06-01
**Type**: ADR (model consolidation / canonical-entity — unblocks the ICF reports + scoring + benchmark service layer)
**Mode**: 🤝 Claude can execute the rename + delegation + re-export shim once the dispositions are signed off; 👤 stakeholder owns the data-migration call (is there live data in the orphaned collection?) and the keep-vs-delete of the rich layer
**Decider**: Clinical lead (ICF assessment workflow owner) + backend owner (model canonicalization)
**Effort**: rename + route delegation + guard ~0.5–1 day once Q1–Q4 answered; **blocked** until then

## Context

Two Mongoose models for the **same concept** (an ICF functioning assessment)
coexist and are registered under **different names**, so they map to **two
different collections**:

| | registered as | where | shape |
| --- | --- | --- | --- |
| **Route-local (thin)** | `IcfAssessment` | inline schema in [`routes/icf-assessments.routes.js`](../../../backend/routes/icf-assessments.routes.js) (`function IcfAssessment()`) | `bodyFunctions / bodyStructures / activities / participation / environmentalFactors` arrays of `{code,qualifier,note}`, `status`, scores. No methods. |
| **Rich (service-backed)** | `ICFAssessment` | [`models/icf/ICFAssessment.model.js`](../../../backend/models/icf/ICFAssessment.model.js) (barrel: `models/ICFAssessment.js`) | full schema + instance methods (`getAllCodes()`, scoring), consumed by `services/icfAssessment.service.js` (21 refs) + `services/icfReport.service.js` + `controllers/icfAssessment.controller.js` |

**Both route files mount at `/api/v1/icf-assessments`:**

- The **thin** router (`icf-assessments.routes.js`) is mounted **first** via
  `_registry.js:663`.
- The **rich** controller router (`icfAssessment.routes.js`, behind
  `clinical-assessment.registry.js`) is mounted **later** (≈`_registry.js:812`
  via `phases.registry`).

Express is **first-match-wins**, so the thin router **shadows** the rich
controller for every overlapping path. The practical effects:

1. **All live assessment CRUD goes through the thin `IcfAssessment` model** →
   documents land in the `icfassessments` collection of the *thin* model.
2. **The rich service/controller/reports layer is effectively dark.** Its
   reports, scoring, and `benchmarkAssessment()` query the *`ICFAssessment`*
   model — a **different, empty collection** — so they return nothing in
   production even though the code is fully built. This is wasted, deliberately-
   built functionality (the service layer predates this ADR).

This is the same shadow/first-match-wins class already fixed for the **sub-**
models that are *not* duplicated:

- **W692** wired `/codes` + `/codes/tree` to the shared, canonical
  `ICFCodeReference` model (47→105 codes via W705 catalog).
- **W706** wired `/benchmarks` + `/:id/benchmark` to the shared, canonical
  `ICFBenchmark` model.

Those were safe because `ICFCodeReference` / `ICFBenchmark` are **single,
shared** models with no duplicate. The **assessment** model is the one
remaining duplicate, and it is the costly one because it splits *persisted
data* across two collections and orphans the entire service/report layer.

Per the CLAUDE.md **canonical-file-location priority** doctrine (W340 lineage:
`models/<domain>/**` outranks a route-local registration), `ICFAssessment`
(`models/icf/`) is the canonical entity and the route-local `IcfAssessment` is
a **Pattern-D rename** candidate.

## Decision (proposed)

**Canonicalize on `ICFAssessment` (the rich, `models/icf/` model), and make the
live thin route delegate to it — while preserving the thin route's security
hardening.**

Concretely, once dispositions are signed off:

1. **Unify the model name.** Replace the route-local `function IcfAssessment()`
   inline registration with a `require('../models/icf/ICFAssessment.model')`
   so both surfaces use **one model / one collection**. This is the critical
   fix — it ends the split-collection data loss.
2. **Preserve the thin route's hardening.** The live `icf-assessments.routes.js`
   carries `router.param('beneficiaryId', branchScopedBeneficiaryParam)` (W440)
   and `stripUpdateMeta()` on writes (W507). The rich controller route does
   **not** obviously carry these. Keep the hardened route as the mounted
   surface; have it call the rich model/service for reports + scoring +
   `benchmarkAssessment()` (which currently `/:id/benchmark` reimplements
   locally per W706). Do **not** simply un-shadow the controller until its
   auth/branch/mass-assignment posture is confirmed equal.
3. **Retire the redundant mount.** After (1)+(2), either delete the duplicate
   controller mount or reduce it to a re-export, so there is exactly one ICF
   assessment surface.

## Open questions (blockers — stakeholder sign-off)

- **Q1 — canonical name:** confirm `ICFAssessment` (rich) is canonical and the
  route-local `IcfAssessment` is renamed/removed. (Recommended: yes — matches
  the service layer + PascalCase + W340 location priority.)
- **Q2 — data migration:** is there **production data already written to the
  thin `IcfAssessment` collection**? If yes, a one-shot migration
  (`IcfAssessment` → `ICFAssessment`) is required before the rename, and the
  thin schema's field names must be reconciled with the rich schema's.
- **Q3 — hardening parity:** does the rich controller/service path need the
  W440 `branchScopedBeneficiaryParam` + W507 `stripUpdateMeta` ported before it
  can serve writes? (Recommended: port to the rich path, keep the hardened
  router mounted.)
- **Q4 — reports/scoring contract:** the rich service's `getAllCodes()` +
  scoring assume a specific document shape. Confirm the thin route's persisted
  shape maps cleanly, or define the reconciliation mapping.

## Consequences

**If adopted:**

- ICF reports, scoring, and per-assessment benchmark comparison become
  reachable in production (today they silently read an empty collection).
- One model, one collection, one mounted surface — no more first-match-wins
  shadowing for the assessment entity.
- The W692/W706 sub-model wiring (`ICFCodeReference` / `ICFBenchmark`) is
  unaffected — those are already canonical and shared.

**If deferred:**

- The rich service/report/scoring layer stays dark; any UI calling the report
  endpoints gets empty data.
- Risk of a future contributor "fixing" reports by seeding the `ICFAssessment`
  collection directly, deepening the split.

**Do NOT** attempt the rename on a branch a parallel agent is actively
committing to (the 2026-06-01 session showed the shared working tree absorbs/
renames uncommitted files); land it on a quiescent branch or a dedicated PR.

## Related

- W692 — `/codes` wired to `ICFCodeReference` (shadow fix, sub-model, no dup)
- W705 — ICF catalog expanded to 105 codes
- W706 — `/benchmarks` wired to `ICFBenchmark` (shadow fix, sub-model, no dup)
- W340 / ADR-021 — canonical-file-location priority + Pattern-D rename framework
- ADR-020 — Student vs Beneficiary canonical-entity precedent
