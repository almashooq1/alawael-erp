# ADR-046 — ICFAssessment schema consolidation

**Status:** 🟡 Proposed (analysis complete; implementation stakeholder-gated)
**Date:** 2026-06-29
**Relates to:** ADR-021 (duplicate-model-registration framework), W1542 (crash break), W1544 (class guard)

## Context

Two LIVE files registered the Mongoose model name `ICFAssessment` with
**incompatible schemas**. W1542 already removed the runtime `OverwriteModelError`
crash by renaming the non-canonical registration to `ICFAssessmentLegacy` on the
same `icfassessments` collection (ADR-021 Pattern D). That fixed the crash; it did
**not** consolidate the data model. This ADR decides whether/how to fully
consolidate.

### The two models are NOT renamed-field twins — they are different data models

| Concern              | Canonical `models/icf/ICFAssessment.model.js` (663 L) | Legacy `models/assessment/ICFAssessment.js` (357 L) |
| -------------------- | ----------------------------------------------------- | --------------------------------------------------- |
| beneficiary key      | `beneficiaryId`                                       | `beneficiary`                                       |
| overall score        | `overallFunctioningScore`                             | `overallScore`                                      |
| assessor             | `assessorId`                                          | `assessor`                                          |
| raw scores           | structured `assessedItems[]` + `bodyFunctions` / `bodyStructures` / `activitiesParticipation` / `environmentalFactors` | a single flat `scores` object |
| core-set selection   | (none)                                                | `coreSetType` (rehab/autism/cp/custom)              |
| statics              | (none)                                                | `findByPatient`, `findLatestByPatient`, `getProgressData`, `getStatistics` |
| registered by name?  | YES — `mongoose.model('ICFAssessment')` lookups + 3 `ref:'ICFAssessment'` | NO — all 8 consumers `require()` the file directly |

### Consumers (8) and the Legacy fields they actually touch

`smart-assessment-engine.routes.js` (mounted, 12 clinical scales),
`mdt-coordination.routes.js`, and services `sessionICFLinker` / `icfReportExport` /
`clinicalDashboard` / `icfGoalIntegration` / `integratedReport` / `parentPortal`.

Field-usage audit (occurrences across the cluster):
`status` ×128 · `beneficiary` ×27 · `domainScores` ×16 · `overallScore` ×10 ·
`notes` ×10 · `goals` ×9 · `assessmentDate` ×8 · `scores` ×7 · `assessor` ×6 ·
`coreSetType` ×3.

Mapping to canonical: `status`/`domainScores`/`notes`/`goals`/`assessmentDate`
already exist on the canonical ✓; `beneficiary`→`beneficiaryId`,
`overallScore`→`overallFunctioningScore`, `assessor`→`assessorId` need aliases;
`scores` (flat) and `coreSetType` have **no canonical equivalent** (gap).

## Options

**A — Enrich the canonical, then re-point Legacy at it (true consolidation).**
On `icf/ICFAssessment.model.js` add: Mongoose `alias` for `beneficiary→beneficiaryId`,
`overallScore→overallFunctioningScore`, `assessor→assessorId` (aliases translate in
queries since Mongoose 5, so the 4 ported statics keep working); add the missing
`scores` (Mixed) + `coreSetType` (enum) fields; port the 4 statics. Then make
`models/assessment/ICFAssessment.js` `module.exports = require('../icf/ICFAssessment.model')`.
*Pros:* one schema, one collection, both clusters interoperate. *Cons:* additive
bloat on the canonical (carries both the structured + flat score representations);
the assessment/ cluster's writes of `scores`/`coreSetType` now persist on the
canonical doc; requires running all 8 consumers' flows against MongoMemoryServer
before merge. **Recommended**, but only after the consumer test harness exists.

**B — Keep them as deliberately distinct entities.** They model ICF differently
(structured item-level vs. flat core-set scoring). Formalise `ICFAssessmentLegacy`
as a separate entity, document it, and stop calling it a "duplicate". *Pros:* zero
migration risk, no clinical-data reshaping. *Cons:* two ICF stores persist; the
unified timeline / analytics see two shapes.

**C — Status quo (W1542).** Crash fixed, distinct names, no consolidation. The
W1544 class guard prevents regression. *Pros:* nothing else to do. *Cons:* the
W340 dual-registration remains flagged (tracking debt).

## ⛔ Decisive implementation finding (2026-06-30) — incompatible REQUIRED-field contracts

A pre-implementation audit of the canonical schema's `required: true` paths shows
Option A is **not** a clean additive operation. The canonical requires, at the top
level: `title`, `assessmentType`, `beneficiaryId`, `assessorId` (+ a unique
auto-`assessmentNumber`). The assessment/ cluster's creates (e.g.
`smart-assessment-engine` / `icfRoutes` POST) provide `beneficiary` /
`coreSetType` / `scores` / `notes` / `assessmentDate` — they do **not** set
`title` or `assessmentType`.

Therefore re-pointing Legacy at the canonical would, on every assessment/ cluster
`.create()`, throw `ValidationError: title/assessmentType required` — i.e. it would
**re-introduce the exact W1540 bug class** (overloaded-model writes that 500) this
session just eliminated. The only ways to avoid that are:

- **A1 — relax the canonical's invariants** (make `title`/`assessmentType`/… optional).
  Weakens the icf/ cluster's clinical contract for every existing consumer — a
  stakeholder-level decision about the canonical model, not a mechanical merge.
- **A2 — rewrite the assessment/ cluster's creates** to supply `title` +
  `assessmentType` and adopt the canonical's structured `assessedItems` instead of
  flat `scores`. Substantial behaviour change across 8 clinical consumers.

The two schemas don't just rename fields — they carry **incompatible required-field
contracts** because they model ICF differently.

## Recommendation (revised after implementation feasibility audit)

Given the incompatible contracts, **Option B — keep them as deliberately distinct
entities — is now the lower-risk, recommended path**. The runtime crash is already
fixed (W1542), the class guard (W1544) prevents regression, and the two genuinely
different ICF representations stay isolated. Formalise `ICFAssessmentLegacy` as a
first-class entity and drop the "duplicate to consolidate" framing.

**Option A remains viable only with an explicit stakeholder decision** on A1 (relax
the canonical contract) vs A2 (migrate the cluster). If A is chosen it MUST ship as
a separate, fully-tested PR with: (1) a `MongoMemoryServer` round-trip per ported
static + alias; (2) a field-coverage assertion (no silent strict-mode drop); (3) a
supertest smoke of `smart-assessment-engine` + `mdt-coordination` create/read.

**Status: analysis + implementation-feasibility complete. The crash is fixed; the
consolidation DIRECTION (B, or A-with-contract-decision) is the remaining
stakeholder call.** Pre-empting it by relaxing the canonical's clinical invariants
would be the wrong kind of "completion".

## ReportTemplate (sibling, ADR-023)

Same crash class, **already** fixed at the runtime level by W1543 (`models.X ||`
guard on the two bare registrations). The full Pattern-D rename of the
non-canonical `analytics/` + root registrations to distinct names is tracked in
**ADR-023** and is lower-risk than ICF (3 genuinely-distinct entities:
analytics-BI / canonical reports / legacy root; 6 `ref:` + 2 name-lookups all want
the canonical `reports/`). It can proceed independently of this ADR once the
`ref:`/name-lookup resolution is confirmed against current `main`.
