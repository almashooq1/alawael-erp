# ADR-040 — Consolidate the three goal models on `TherapeuticGoal` as canonical for the golden thread (🟡 Proposed)

> **Progress — additive phase SHIPPED under owner delegation (W1133, 2026-06-10):**
> the non-destructive Option-C scaffolding is in: `Goal` gained an optional
> `therapeuticGoalId` bridge → `TherapeuticGoal`; `Goal.linkedMeasures` (W1090) and
> `SmartGoal` carry `@deprecated` markers (stop new code piling on). Guard
> `goal-therapeutic-bridge-wave1133`. The **destructive phase** (populate the
> bridge in the care-plan builder · re-point callers · migrate + retire `SmartGoal`
> rows) **remains gated on Q1–Q4** — no data was touched.

**Date**: 2026-06-10
**Type**: ADR (model consolidation / canonical-entity — de-fragments the "goal" concept that the assessment→goal→measure→outcome golden thread depends on)
**Mode**: 🤝 Claude can execute the deprecation shim + the `Goal`(IEP)→`TherapeuticGoal` reference wiring once dispositions are signed off; 👤 stakeholder owns the keep-vs-migrate call for any live `SmartGoal` / embedded-IEP-goal data
**Decider**: Clinical lead (goal-setting workflow owner) + backend owner (model canonicalization)
**Effort**: deprecate `SmartGoal` + add `Goal`(IEP)→`TherapeuticGoal` ref + guard ≈ 1–2 days once Q1–Q4 answered; **blocked** until then
**Related**: ADR-026 (IEP/IFSP/CarePlan fragmentation), ADR-038 (ICF assessment-model duplication — same shadow/duplication class), ADR-020 (Student vs Beneficiary), W1090 (`Goal.linkedMeasures` — the tactical step that surfaced this)

## Context

Three Mongoose models represent **"a goal"** and coexist under different names →
three different collections, three different linkage mechanisms:

| Model                 | Registered / file                                                                                     | Scope                                                                                           | Goal↔Measure linkage                                                                                                                                                                                             | Callers (approx)                                                                                                                                                                                                                                                                                                                                                            |
| --------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`TherapeuticGoal`** | [`domains/goals/models/TherapeuticGoal.js`](../../../backend/domains/goals/models/TherapeuticGoal.js) | Standalone clinical SMART goal (long/short/session), bound to beneficiary + episode + care plan | **Rich** — W235 `measureLinkSchema` per objective: `LINK_TYPES` (PRIMARY/SECONDARY/SCREENING_ONLY/PROXY/CONTRAINDICATED), weights, `expectedTarget`, MCID expectation, per-link review cycle. Refs **`Measure`**. | **~20 services + 12 ref'ing models.** The entire measures/outcomes pipeline keys on it: `goalMeasureLinkage`, `goalLinkageInsights`, `goalForecaster`, `measureOutcomesAggregator`, `measureGoalUpdater`, `measureClinicalReport`, `measureReadinessGate` + GAS (`GasScoring`/`GasScale`) + `RecommendationEngine`/`QualityEngine`/`ReportsEngine`/`DecisionSupportEngine`. |
| **`Goal`** (IEP)      | [`models/Goal.js`](../../../backend/models/Goal.js)                                                   | Embedded inside `CarePlan` domains (`educational.*` / `therapeutic.*` / `lifeSkills.*`)         | **New & thin** — W1090 `linkedMeasures[]` (refs **`MeasurementMaster`**), + W452 `icfMapping[]`                                                                                                                   | care-plans-admin routes; care-plan builder                                                                                                                                                                                                                                                                                                                                  |
| **`SmartGoal`**       | [`models/SmartGoal.js`](../../../backend/models/SmartGoal.js)                                         | Lightweight therapist quick-goal (milestones, %)                                                | **None**                                                                                                                                                                                                          | `therapistPro` `/smart-goals` + `assessmentRecommendation` routes (2 surfaces)                                                                                                                                                                                                                                                                                              |

**Why this matters now.** The golden thread (assessment → goal → measure →
outcome → GAS → forecast) is the platform's core value loop. It is **already
fully built — on `TherapeuticGoal`.** When W1090 added `linkedMeasures` to the
IEP `Goal` model, it created a **second, parallel** goal↔measure mechanism that
none of the ~20 outcomes services understand. Continuing to build goal↔measure
UI/logic on `Goal` (IEP) would deepen the split and strand work the way ADR-038
documents for ICF assessments.

**Secondary fragmentation surfaced.** The two linkages even point at **different
measure models**: `TherapeuticGoal` → `Measure`; `Goal`(IEP) → `MeasurementMaster`.
Whether `Measure` and `MeasurementMaster` are themselves a duplicate pair is a
follow-on question (candidate ADR-041) — flagged, not resolved here.

## Decision drivers

1. **Single source of truth** for the goal↔measure↔outcome loop (CLAUDE.md tenet).
2. **Canonical-location doctrine** (W340 lineage): `domains/<x>/models/**` rich,
   method-bearing, widely-consumed model outranks a root `models/Goal.js` and a
   route-local lightweight model. → `TherapeuticGoal` is canonical.
3. **Don't strand built functionality** (ADR-038 lesson): the outcomes/GAS/forecast
   layer is real and only speaks `TherapeuticGoal`.
4. **IEP structure is still legitimate.** `CarePlan` needs its domain-bucketed IEP
   goal _structure_; that is an organizational concern, not a reason to re-implement
   measure linkage.

## Options

- **A — Status quo (do nothing).** Three models, two measure-link mechanisms.
  ❌ Guarantees the split widens; outcome dashboards stay partial/inconsistent.
- **B — Hard-merge everything into `TherapeuticGoal`.** Migrate IEP-embedded goals
  and SmartGoals into standalone `TherapeuticGoal` docs; `CarePlan` references them.
  ✅ Cleanest end state. ❌ Largest migration; touches the IEP/CarePlan shape (ADR-026 territory) — high blast radius, especially mid-`feat/w928-core-linkage`.
- **C — `TherapeuticGoal` canonical; `Goal`(IEP) _references_ it; deprecate `SmartGoal`** _(recommended)_.
  - `TherapeuticGoal` = the canonical clinical goal carrying the measure linkage + outcomes.
  - `Goal`(IEP) keeps its CarePlan-domain _structure_ but each domain goal gains a `therapeuticGoalId` ref to the canonical goal; **W1090 `linkedMeasures` on `Goal` is frozen as a tactical stopgap** and is superseded by the ref (read-through to the canonical goal's links). No bulk data migration required to start.
  - `SmartGoal` → deprecation shim (only 2 caller surfaces); new writes go to `TherapeuticGoal`; existing rows read-only until migrated.
    ✅ Incremental, low blast radius, converges everyone on one linkage. ❌ Interim period where `Goal`(IEP) carries both a (frozen) `linkedMeasures` and a `therapeuticGoalId`.

## Recommendation

**Adopt Option C.** It makes `TherapeuticGoal` the single canonical goal for the
golden thread without a risky big-bang CarePlan migration, retires the unused
`SmartGoal` linkage path, and reframes W1090 honestly: it was a useful tactical
step (and it surfaced + fixed the W1091 goal-create mass-assignment hole), but the
**strategic linkage lives on `TherapeuticGoal`**. Stop building new goal↔measure
surface on `Goal`(IEP); point it at the canonical model instead.

### Sketch (once signed off)

1. Add `Goal.therapeuticGoalId` (ref `TherapeuticGoal`, optional) + a drift guard
   that new care-plan goal↔measure reads resolve through it.
2. Mark `Goal.linkedMeasures` `@deprecated — see ADR-040` in source; keep the field
   - invariants (no breaking change) but route new UI to the canonical linkage.
3. `SmartGoal`: add a deprecation banner + redirect the 2 write surfaces to
   `TherapeuticGoal`; add a guard forbidding new `SmartGoal` write callers.
4. Open **ADR-041** for the `Measure` vs `MeasurementMaster` measure-model question.

## Open questions (stakeholder)

- **Q1.** Is there live `SmartGoal` data in production that must be migrated, or can
  it be read-only-deprecated?
- **Q2.** Should CarePlan IEP goals eventually _become_ `TherapeuticGoal` docs
  (Option B end-state), or permanently _reference_ them (Option C end-state)?
- **Q3.** Confirm `TherapeuticGoal` is the intended canonical (vs. promoting `Goal`)
  — the caller/outcomes evidence says yes.
- **Q4.** Are `Measure` and `MeasurementMaster` the same concept (→ ADR-041)?

## Consequences

- **Positive:** one canonical goal for the golden thread; outcome/GAS/forecast
  dashboards become consistent; no new stranded linkage; `SmartGoal` debt retired.
- **Negative / interim:** `Goal`(IEP) temporarily carries both a frozen
  `linkedMeasures` and `therapeuticGoalId`; a deprecation window for `SmartGoal`.
- **Follow-on:** ADR-041 (`Measure` vs `MeasurementMaster`); revisit ADR-026
  (IEP/IFSP/CarePlan) since goal canonicalization narrows that surface.

> **Status: 🟡 Proposed.** Blocked on Q1–Q4 sign-off. No code changes ship from
> this ADR until then; `Goal.linkedMeasures` (W1090) and the W1091 fix remain as-is.
