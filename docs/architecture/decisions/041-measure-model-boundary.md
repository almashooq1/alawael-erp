# ADR-041 — Resolve the `Measure` vs `MeasurementMaster` measure-model overlap; make `Measure` canonical for the golden thread (🟡 Proposed)

**Date**: 2026-06-10
**Type**: ADR (model consolidation / bounded-context clarification — the measure-definition half of the goal↔measure golden thread)
**Mode**: 🤝 Claude can execute the `Goal.linkedMeasures` ref correction + a boundary guard once dispositions are signed off; 👤 stakeholder owns whether the `measurement-system` (`MeasurementMaster`/`Result`) is a distinct psychometric context or a duplicate to fold
**Decider**: Clinical lead (assessment/measure owner) + backend owner
**Effort**: ref correction + guard ≈ 0.5 day; full fold/merge (if chosen) larger — **blocked** until Q1–Q3 answered
**Related**: ADR-040 (goal-model consolidation — this is its flagged follow-on), ADR-038 (ICF assessment-model duplication — same class), W1090 (`Goal.linkedMeasures` ref'd the non-canonical model)

## Context

Two Mongoose models define **"a standardized measure / assessment instrument"**
and back two parallel ecosystems:

| Model                   | File                                                                                                              | Ecosystem                                                                                                                                                                        | Integration evidence                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`Measure`**           | [`domains/goals/models/Measure.js`](../../../backend/domains/goals/models/Measure.js)                             | The **golden-thread measures library** (W210–W576): governance, scoring, administration, baseline slots, reassessment, outcomes, trends, recommendation, ministry/family reports | **Canonical.** The _entire_ `services/measure*.service.js` suite resolves `mongoose.model('Measure')` (scoringEngine, administration, alertEngine, baselineSlot, outcomesAggregator, trendEngine, progressInterpreter, ministry/family report, …). **8 model refs** incl. **`TherapeuticGoal`** (the ADR-040 canonical goal), `MeasureApplication`, `MeasureBaselineSlot`, `MeasureAlert`, `MeasureReassessmentTask`, `ProgramEnrollment`, `EpisodeOfCare`. |
| **`MeasurementMaster`** | [`models/measurement/MeasurementMaster.model.js`](../../../backend/models/measurement/MeasurementMaster.model.js) | A separate **"measurement-system"** (`MeasurementMaster` + `MeasurementResult` + `MeasurementType` + `MeasurementService` + `measurements.routes` + `measurement-system.seed`)   | **Minor.** Only **3** `ref: 'MeasurementMaster'` in the whole backend: `MeasurementResult` (its own pipeline), itself, and **`Goal.linkedMeasures`** (W1090, mine). Schema example is `MEAS-IQ-WECHSLER-001` → looks psychometric/IQ-leaning.                                                                                                                                                                                                               |

**The W1090 self-correction.** R1 wired `Goal.linkedMeasures.measureId →
ref: 'MeasurementMaster'` — i.e., it pointed the new goal↔measure link at the
**minor** model, while the canonical golden thread (TherapeuticGoal + the whole
outcomes/GAS/recommendation suite) speaks **`Measure`**. This is a canonical-ref
_semantic mismatch_ (CLAUDE.md bug-class 2: "registered but conceptually wrong").
It is low-impact today (the field is empty, and ADR-040 already freezes it), but
it is concrete corroboration that `Measure` — not `MeasurementMaster` — is the
golden-thread measure model.

**The honest nuance.** This may not be a pure duplicate. `MeasurementMaster`'s
`MEAS-IQ-WECHSLER` example + the separate `iq-assessments` surface (W714) suggest
the measurement-system might be a **distinct psychometric/IQ bounded context**
(norm-referenced standardized tests) rather than the **functional rehab-outcome
measures** that `Measure` governs. The two might legitimately coexist _if_ the
boundary were explicit — but today it is **not**, so a developer (me, in W1090)
reached for the wrong one. ADR must clarify the boundary, not assume deletion.

## Decision drivers

1. **One canonical measure for the golden thread** — outcome/GAS/forecast
   dashboards must aggregate one measure model. That is `Measure` (evidence above).
2. **Explicit bounded contexts** — if `MeasurementMaster` serves psychometric/IQ
   testing, that purpose must be _named and fenced_ so nobody links a rehab goal to
   it by accident (as W1090 did).
3. **No silent duplication** (ADR-038 lesson) — two unlabelled "measure" models is
   exactly how built functionality gets stranded.

## Options

- **A — Status quo.** Two unlabelled measure models. ❌ Guarantees more mis-wiring
  like W1090; outcome aggregation stays ambiguous.
- **B — Fold `measurement-system` into `Measure`.** Migrate `MeasurementMaster`
  rows into `Measure` (with a `category: 'psychometric'`), retire the parallel
  Result/Type/Service/routes. ✅ Single model. ❌ Largest migration; only justified
  if the measurement-system is truly redundant (Q1).
- **C — Declare `Measure` canonical for the golden thread; fence `measurement-system`
  to its psychometric scope; correct W1090** _(recommended)_.
  - `Measure` = canonical for all goal↔measure↔outcome linkage.
  - If the measurement-system is a live psychometric/IQ context, **document it as a
    distinct bounded context** (its own catalog) and add a guard forbidding rehab
    goal/outcome code from referencing `MeasurementMaster`.
  - **Correct W1090**: when `Goal.linkedMeasures` is un-frozen (per ADR-040) its
    `measureId` ref must become `Measure`, not `MeasurementMaster`.
    ✅ Low blast radius, removes the mis-wiring hazard, preserves a real psychometric
    context if one exists. ❌ Leaves two models (intentionally, with a fence).

## Recommendation

**Adopt Option C.** Make `Measure` the single canonical measure model for the
golden thread; treat `MeasurementMaster`/`measurement-system` as a **scoped
psychometric context pending Q1 confirmation** (fold via Option B only if it turns
out redundant). Either way, **`Goal.linkedMeasures` must reference `Measure`** —
W1090's `MeasurementMaster` ref is wrong and is retained only because ADR-040
freezes that field for deprecation.

## Open questions (stakeholder)

- **Q1.** Is the `measurement-system` (`MeasurementMaster`/`Result`/`Service`/
  `measurements.routes`) **live** with production data, and does it serve a
  **distinct** purpose (psychometric/IQ norm-referenced tests) vs. `Measure`'s
  functional rehab-outcome library? (Determines fence vs. fold.)
- **Q2.** If distinct, what is the one-line boundary rule (e.g. "norm-referenced
  standardized psychometric instruments → `MeasurementMaster`; functional
  rehab-outcome measures linked to goals → `Measure`")?
- **Q3.** Confirm `Measure` is canonical for goal↔measure↔outcome (the service +
  ref evidence says yes).

## Consequences

- **Positive:** one canonical measure for the golden thread; the W1090 mis-wiring
  is named and slated for correction; psychometric context (if real) gets an
  explicit fence instead of accidental reuse.
- **Negative / interim:** two measure models persist under Option C (by design,
  fenced); a guard + the W1090 ref correction are owed once un-frozen.
- **Follow-on:** executes alongside ADR-040 (same freeze/deprecation window);
  closes the measure half of the golden-thread canonicalization.

> **Status: 🟡 Proposed.** Blocked on Q1–Q3 sign-off. No code ships from this ADR
> until then; `Goal.linkedMeasures` (W1090) stays as-is (frozen per ADR-040).
