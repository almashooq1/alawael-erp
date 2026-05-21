# 36 — Future Intelligence Layer (Deferred Phase 2)

> **Status:** `DEFERRED — DO NOT BUILD YET` > **Authored:** 2026-05-21
> **Trigger to reconsider:** explicit re-validation against the four gating conditions in §10 below.

---

## 1. Why this doc exists

The measures/outcomes vertical (Waves W210→W248) shipped a clinical-grade foundation:
catalog + version-pinning + MCID-gated interpretation + trend engine + alert engine +
goal-measure linkage with W235 invariants + decision suggestions (Q2-Q6) +
3 audience-specific dashboards + 3 audience-specific reports (family / ministry / clinical) +
4 mutation modals (Review / Unlink / Create / Modify) + weighted-progress trend chart.

During the W248 architecture session, a Phase-2 design was elaborated — Bayesian
inference, causal attribution, IRT/CAT, federated calibration, predictive trajectories,
counterfactual simulation, etc.

**This doc captures that design and explicitly defers it.** It is not a roadmap. It is a
fence to prevent premature optimization.

---

## 2. Why we are NOT building this now

| Concern                      | Evidence                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Real-user validation thin    | No record of structured therapist-feedback sessions on W244/W248.                                             |
| UI test coverage absent      | 0 UI tests across web-admin; only typecheck+lint.                                                             |
| Wave-collision friction      | 10+ "parallel agent absorbed my work" incidents in session memory — coordination debt before complexity debt. |
| Regulatory pathway undefined | MOH/MOHRSD validation requirements for AI-driven clinical recommendations not investigated.                   |
| Adoption signal unknown      | No instrumentation in place to know if shipped dashboards/modals are being used by their intended audiences.  |

**Conclusion:** the system is ahead of its validation loop. Stretching it further
amplifies the gap between what we built and what we can defend clinically.

---

## 3. The deferred architecture (frozen reference)

What follows is the design **as discussed**. It is intentionally summarized — the goal
is to preserve intent, not to provide implementation detail premature to evidence.

### 3.1 Statistical Intelligence — Bayesian trend posteriors

Replace W219 categorical trend classification (`PLATEAU | REGRESSION | …`) with
posterior distributions over the same categories + credible intervals for slope.

```
TrendPosterior {
  distribution: { CATEGORY → probability }
  point_estimate: 'PLATEAU'
  uncertainty:   entropy_normalized ∈ [0, 1]
  credible_interval_slope: [low, high] per month
  evidence_strength: Bayes_factor_vs_null
}
```

**Why deferred:** clinical value depends on UI surfacing uncertainty _and_ clinicians
internalizing what credible intervals mean. Both are untested.

### 3.2 Personalized MCID — local recalibration

Three-tier resolution: `personalized_local` > `cohort_adjusted_literature` >
`measure.interpretation.mcid` (current).

```
MCIDResolution(beneficiary, measure):
  if local_data.n(matched_cohort) ≥ 100 and confidence ≥ moderate:
    return empirical_mcid(cohort = age±2, dx, baseline±SD)
  else if cohort_adjusted_factor available:
    return literature_mcid × adjustment_factor(age, dx)
  else:
    return measure.interpretation.mcid  # current
```

**Why deferred:** requires N ≥ 100 per cohort + governance committee to approve drift
from literature values. We don't have either.

### 3.3 Causal Inference — intervention attribution

Estimate `intervention_effect = observed_delta − counterfactual_estimate(synthetic_control)`
to answer _did the intervention cause the change?_ rather than _did the change happen?_.

**Why deferred:** synthetic-control methodology is research-grade. Misuse at small N is
worse than no causal claim at all.

### 3.4 Adaptive Measurement — IRT / CAT

Item Response Theory-driven adaptive item selection: stop when SE(θ) < threshold.
Reduces 60-min admins to 15-20 items.

**Why deferred:** requires calibrated item banks per measure. None of the measures in
the W210 catalog have IRT parameters. Building them is a multi-year research program.

### 3.5 Predictive Trajectories + Risk Stratification

Forecast next 30/90 days per (beneficiary × measure) + composite RiskScore ∈ [0,1]
that drives dashboard prioritization.

**Why deferred:** forecasts only earn trust after the system is demonstrably right.
We have no track record yet.

### 3.6 Active Learning Loop

Recommendations carry `confidence` + `uncertainty_explanation`. Clinician accept/reject

- 30-day outcome → retrains model monthly.

**Why deferred:** retraining infrastructure not in place. Need stable production model
serving before we can replace it.

### 3.7 Counterfactual Simulator

`GoalSimulator.run(goalId, hypothetical_changes)` → predicted outcomes per scenario.

**Why deferred:** simulator needs validated outcome model. We have W229 aggregates, not
a model.

### 3.8 Cost-Effectiveness Layer

Per-measure economic profile (therapist_minutes, equipment, MCID detection rate,
decision change rate) → efficiency_score for Selection Engine ranking.

**Why deferred:** requires accurate cost data per measure per admin. ERP integration
work is downstream.

### 3.9 Concept Drift Detection

Weekly comparison: local empirical MCID vs reference MCID. Drift > 30% with N ≥ 100
raises governance alert.

**Why deferred:** only meaningful once §3.2 is in place.

### 3.10 Anomaly & Bias Detection

`AdminAnomalyDetector` flags impossibly-fast admins, assessor ceiling bias, implausible
deltas, pattern-filling responses.

**Why deferred (partially):** the simplest variants (impossible duration, implausible
delta exceeding 10×SDC) could ship as W235-style invariants without ML. See §11.

### 3.11 Behavioral Nudging Engine

Adaptive channel/time/framing per recipient based on historical response rates.

**Why deferred:** requires nudge-response telemetry. Not instrumented.

### 3.12 Federated Cross-Branch Learning

Differential-privacy aggregation of MCID/SDC across branches → blended Bayesian
shrinkage estimates per branch.

**Why deferred:** PDPL legal review required + minimum 5 branches with active data.

### 3.13 Multi-Stakeholder View Synthesis

Same source-of-truth, role-specific aggregation layer. Therapist / supervisor /
director / family / ministry / payer / beneficiary-self.

**Why deferred:** we already have therapist + supervisor + director + family + ministry
in shipped form (W237/W244/W248/W240/W242). Payer + beneficiary-self surfaces have no
identified consumer yet.

### 3.14 Explainable Reasoning Trail

Each recommendation carries a graph of observation → rule → fit_check → precedent →
verdict edges.

**Why deferred:** depends on §3.6 to be valuable. Logging reasoning today without
feedback loop = audit overhead with no learning return.

### 3.15 Engagement Signals

Session attendance + home program completion + self-reported progress + family
engagement + motivation signals.

**Why deferred:** mobile-app instrumentation work upstream.

### 3.16 Quality-of-Evidence Weighting

Per-admin `evidenceWeight ∈ [0, 1]` from assessor certification + duration
appropriateness + completeness + inter-rater reliability + anomaly flags. Trend
computation switches from OLS to weighted regression.

**Why deferred (partially):** weights from existing data (assessor certification +
completion + duration) are achievable today. See §11.

### 3.17 Architecture cross-cutting patterns

Event-sourcing for MeasureAdministration; CQRS read-models for dashboards;
Saga pattern for mutations that span multiple aggregates.

**Why deferred:** premature for current throughput. Materialize when read-side latency
becomes a complaint, not before.

---

## 4. Multidisciplinary Synthesis Engine — closest "next gap"

A separate design (W248 session) for `services/multidisciplinarySynthesis.service.js`
that consumes W229 + W219 + W221 + W235 and emits a unified 5-section synthesis:

- `keyChanges` — improvements crossing MCID with cross-discipline corroboration
- `unchangedAreas` — plateau vs stable vs ceiling distinction
- `concerningDeclines` — regression with differential explanations + urgency
- `familyExplanation` — W240-vocabulary plain Arabic per domain
- `treatmentPlanImplications` — priority-ranked MDT actions

This engine is **not part of the deferred Phase 2 freeze**. It is rule-based, not
ML-based, and closes a genuine operational gap (no current surface synthesizes
across PT/OT/SLP/SPED).

**Status:** designed (see W248 conversation memory). Scheduled for build only AFTER
the gating conditions in §10 are met.

---

## 5. What we ARE doing instead (next 4 weeks)

| Item                                                                                     | Owner                   | Rationale                                             |
| ---------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------- |
| 5–10 structured therapist feedback sessions on W237/W244/W248 dashboards                 | Clinical lead           | Bridge the validation gap.                            |
| UI test suite — modals (Review/Unlink/Create/Modify) + dashboard smoke tests             | Engineering             | Catch regressions before users do.                    |
| Adoption telemetry — instrument dashboard page views + modal completion rates per role   | Engineering + Analytics | Know if anyone is actually using what we shipped.     |
| Regulatory pathway investigation — MOH/MOHRSD requirements for AI-driven recommendations | Compliance              | De-risk before recommendations carry clinical weight. |
| Cross-agent coordination policy — task-locking or branch-per-agent                       | Engineering             | Stop wave collisions from polluting audit trail.      |

---

## 6. Implementation-roadmap notes (for when Phase 2 _does_ unfreeze)

When and only when §10 conditions are met, build in this order:

1. **Quality-of-Evidence Weighting (§3.16)** — pure data-engineering, no ML, immediate
   trend-engine improvement.
2. **Simple Anomaly Detection (§3.10 subset)** — duration + delta-magnitude invariants
   as W235-style guards.
3. **Multidisciplinary Synthesis Engine (§4)** — rule-based, unblocks MDT workflow.
4. **Personalized MCID Tier 1 (§3.2)** — when N ≥ 100 per cohort accumulates.
5. **Bayesian Trend Posteriors (§3.1)** — once clinicians are comfortable with
   categorical trends and ask for uncertainty.
6. **Predictive Trajectories (§3.5)** — only after the above earn trust.
7. **Active Learning Loop (§3.6)** — requires retraining infra.
8. **Causal Inference (§3.3)** + **Counterfactual Simulator (§3.7)** — research-grade,
   ship last.

IRT/CAT (§3.4) is a parallel multi-year track, not part of the linear sequence.

---

## 7. Anti-patterns to refuse

- **Bayesian inference without uncertainty UI** — point-estimate from posterior is a
  worse version of current categorical classification.
- **Causal claims at N < 50** — synthetic-control with small N is opinion in algorithmic
  drag.
- **Personalized MCID without governance** — silently overriding literature values
  becomes indefensible at audit.
- **IRT scoring without published item-bank calibration** — invented difficulty
  parameters are not adaptive testing, they're guessing.
- **Federated learning without DP proof** — privacy claim without mathematical guarantee
  fails PDPL review.
- **Engagement nudges without opt-out + frequency cap** — clinician fatigue erodes
  every other signal.
- **Reasoning provenance without feedback loop** — audit data with no learning
  consumer is overhead, not value.

---

## 8. Risks of building Phase 2 prematurely

| Risk                                                                                               | Likelihood | Impact    |
| -------------------------------------------------------------------------------------------------- | ---------- | --------- |
| Clinicians distrust system after seeing wrong recommendation with confidence label                 | high       | high      |
| Audit finds AI recommendations drove decisions without validation                                  | medium     | very high |
| Maintenance burden of unused intelligence layers consumes new-feature capacity                     | high       | medium    |
| Vendor lock-in to specific ML infra (Stan/PyMC/etc) before justified                               | medium     | medium    |
| Performance regression as Bayesian/causal compute layers stack                                     | medium     | medium    |
| Diverging interpretation between baseline rules and Phase 2 layer creates contradiction in same UI | high       | high      |

---

## 9. Risks of NOT building Phase 2 (counter-argument)

To be fair to the deferred work:

| Risk                                                                               | Likelihood | Impact |
| ---------------------------------------------------------------------------------- | ---------- | ------ |
| Competitor ships AI-driven decision support first and captures regulator attention | medium     | medium |
| Categorical classifications mislead at edge cases where uncertainty matters        | medium     | medium |
| Population MCID continues to fit Saudi cohort poorly without local recalibration   | medium     | medium |
| Adoption stalls because system feels "static" / "not learning"                     | low        | low    |

The verdict: deferred risks are real but tractable. Premature-build risks are worse.

---

## 10. Conditions to reconsider ("unfreeze gates")

Phase 2 work may begin only when ALL of the following are true:

- [ ] At least 30 structured therapist feedback sessions completed across W237/W244/W248,
      with feedback summarized and acted upon.
- [ ] UI test coverage ≥ 60% for measures-vertical surfaces (modals + dashboards).
- [ ] Adoption telemetry shows ≥ 50% of intended-audience users have used each shipped
      surface at least 3 times in a 30-day window.
- [ ] Regulatory pathway documented for AI-driven clinical recommendations under MOH/MOHRSD
      frameworks; legal review obtained.

If any one of these is false, the entire deferred layer stays frozen. No partial
unfreeze.

---

## 11. Carve-out: tractable items that DO NOT require unfreeze

Three items from §3 are simple enough to be built incrementally without triggering the
freeze conditions, because they are rule-based hardening rather than ML/inference:

1. **Admin anomaly invariants** (§3.10 subset) — `duration_min < 5 && expected ≥ 30`,
   `|delta| > 10 × SDC`, `all_items_same_score` → soft warning on save. Pure rules.
2. **Quality-of-Evidence weight scaffold** (§3.16) — compute and store
   `evidenceWeight` per admin from existing fields (assessor certification status,
   completion %, duration band). Storage + display only; do NOT yet feed into trend
   computation.
3. **Reasoning trail logging** (§3.14 subset) — log `reasoning_graph` JSON on
   every Q2-Q6 suggestion call. Storage only; do NOT yet surface in UI.

These three are storage / scaffolding work that prepares the ground for Phase 2
without committing to it. Build only if the team has slack capacity AND the work does
not displace §5 priorities.

---

## 12. Document lifecycle

- **Re-review date:** 2027-05-21 (one year from authoring) — even if §10 conditions
  remain unmet, revisit assumptions.
- **Owner:** Clinical decision-support architect.
- **Authority to amend:** This document captures a deliberate scope decision. Amendments
  require either (a) §10 gates passing or (b) explicit reversal by clinical director +
  engineering lead with documented rationale.

---

## 13. Related documents

- `docs/blueprint/19-care-planning-engine.md` — care-plan vertical the measures vertical
  feeds.
- `docs/blueprint/31-role-based-decision-support.md` — role-specific dashboard
  philosophy that already constrains where Phase 2 outputs would surface.
- `docs/blueprint/30-data-trust-quality.md` — data quality governance Phase 2 evidence
  weighting would extend.
- `~/.claude/projects/.../memory/MEMORY.md` — wave-level implementation history for
  W210→W248.
