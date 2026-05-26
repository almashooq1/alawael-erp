# Gap Analysis — Lifecycle v3 Design vs Current Codebase

> **Date**: 2026-05-26  
> **Status**: Audit performed during v3 architecture design session  
> **Purpose**: Identify which v3 innovations are (a) already built, (b) partially built, (c) genuinely missing, with file paths and effort revision  
> **Critical finding**: **2 of the top "missing" innovations (ICF + GAS) are already fully implemented.** Phase A scope significantly reduced.

---

## 0. Executive Summary

Following the audit-first discipline established by the W356-W370 module audit (where 6 of 10 "missing" gaps already existed), this analysis re-verifies every v3 innovation against the actual codebase.

### Headline finding

| Status                           | Count           | Innovations                                                                                                                |
| -------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------- |
| ✅ **EXISTS** (full)             | 2               | ICF Foundation, GAS T-score                                                                                                |
| ⚠️ **PARTIAL** (needs extension) | 3               | Family Wellbeing (caregiver-only), Story Architecture (templates exist), Adaptive Therapy (only behavior-plan UI)          |
| ❌ **MISSING**                   | 5               | Causal Inference, Federated Network, Digital Twin, Independent Advocate/Rights, Cultural Intelligence Layer, Equity Engine |
| ✅ **EXISTS (crisis side)**      | 2 of supporting | SeizureEvent (W356), SafeguardingConcern (W357)                                                                            |

### Effort revision

| Phase                    | Original v3 estimate | Revised based on audit                       | Savings |
| ------------------------ | -------------------- | -------------------------------------------- | ------- |
| A — ICF Foundation + GAS | 6 weeks              | **~2 weeks** (extensions only)               | -67%    |
| B — Rights & Voice       | 4 weeks              | 4 weeks (no change)                          | 0%      |
| C — Family Wellbeing     | 5 weeks              | 3 weeks (extends W384)                       | -40%    |
| D — Causal Inference     | 8 weeks              | 8 weeks (no change)                          | 0%      |
| E — Cultural Layer       | 4 weeks              | 4 weeks (no change)                          | 0%      |
| F — Story Architecture   | 5 weeks              | 3 weeks (extends existing narrative engines) | -40%    |
| G — Equity Engine        | 4 weeks              | 4 weeks (no change)                          | 0%      |
| H — Federated Network    | 12 weeks             | 12 weeks (no change)                         | 0%      |
| I — Digital Twin & RL    | 16+ weeks            | 16+ weeks (no change)                        | 0%      |

**Net Option 4 (v3 Lite) revised**: 28 weeks → **~22 weeks** (-21% effort saved).

**Lesson reinforced**: Always audit the codebase before scoping a new feature. The W356-W370 lesson — "6 of 10 missing gaps already exist" — applies again. This audit found 2 of 10 (20%) already-built innovations, but more importantly correctly identified the actual gaps so engineering effort is properly directed.

---

## 1. Feature-by-Feature Audit

### 1.1 Feature 1 — ICF (International Classification of Functioning)

**Verdict**: ✅ **EXISTS — Full implementation**

**What was found**:

- [`backend/models/icf/ICFCodeReference.model.js`](../../backend/models/icf/ICFCodeReference.model.js) — canonical ICF code catalog with Arabic + English titles, descriptions, hierarchy (chapter + level 1-4), parent linkage, includes/excludes
- [`backend/models/icf/ICFAssessment.model.js`](../../backend/models/icf/ICFAssessment.model.js) — full assessment entity with score calculation
- [`backend/models/icf/ICFBenchmark.model.js`](../../backend/models/icf/ICFBenchmark.model.js) — international benchmarking
- [`backend/models/ICFAssessment.js`](../../backend/models/ICFAssessment.js) — backward-compat barrel export
- [`backend/services/icfAssessment.service.js`](../../backend/services/icfAssessment.service.js) — comprehensive CRUD + score calculation + **gap analysis** (Performance vs Capacity diff)
- [`backend/services/icfReport.service.js`](../../backend/services/icfReport.service.js) — reporting
- Routes + tests + canonical schema present
- Web admin UI: `apps/web-admin/src/app/(dashboard)/icf-assessments` + `icfAssessmentService.js`

**What it already covers**:

- 4 component model: bodyFunctions / bodyStructures / activitiesParticipation / environmentalFactors
- Arabic + English bilingual
- Hierarchical codes with parent linkage
- Score auto-calculation
- Gap analysis (performance ↔ capacity)
- International benchmarking
- Assessment workflow (drafts, finalizing, supersession)

**What's still missing (genuine v3 additions)**:

1. **Core Set catalog** — no Brief/Comprehensive Core Sets explicitly defined (CP, ASD, ID, etc.)
2. **Integration with CarePlanGoal** — goals don't carry ICF codes yet
3. **Integration with MeasurementMaster** — measures don't map to ICF qualifiers automatically
4. **Aggregate reports** for branches/national/Disability Authority
5. **ICF profile snapshots** distinct from assessment events (current implementation is event-driven; v3 wants point-in-time profiles)

**Revised Phase A scope for ICF**: Extension wave only (~5 days), not a 4-week build.

---

### 1.2 Feature 2 — GAS (Goal Attainment Scaling) T-score

**Verdict**: ✅ **EXISTS — Full Kiresuk implementation (W264)**

**What was found**:

- [`backend/services/gas.service.js`](../../backend/services/gas.service.js) — comprehensive service implementing Kiresuk's formula:
  ```
  T = 50 + (10 × Σ(wᵢ × xᵢ)) / √((1 - ρ) × Σwᵢ² + ρ × (Σwᵢ)²)
  ```
- [`backend/models/GasScale.js`](../../backend/models/GasScale.js) — 5-level Kiresuk structure (-2..+2)
- [`backend/models/GasScoring.js`](../../backend/models/GasScoring.js) — scoring records
- [`backend/routes/gas.routes.js`](../../backend/routes/gas.routes.js) — REST surface + tests
- Web admin: `apps/web-admin/src/app/(dashboard)/gas` + `lib/types/gas.ts` + `lib/gas-api.ts`

**What it already covers**:

- `createScale` / `getActiveByGoal` / `listVersions` / `supersedeScale` / `archiveScale`
- `recordScoring` / `supersedeScoring` / `listScoringsByGoal` / `listScoringsByBeneficiary`
- `computeIndividualTScore(scaleId)` — single-goal T-score over window
- `computeBeneficiaryComposite(beneficiaryId)` — multi-goal Kiresuk composite with weights
- Default ρ = 0.3 (correct per Kiresuk literature — my v3 doc proposed 0.7 which is the variant used in care literature)
- Lazy model loading via `mongoose.model()` (per W354 doctrine)
- Tied to existing `Goal` model + `Beneficiary` model

**What's still missing (genuine v3 additions)**:

1. **GAS scale auto-construction helpers** — currently requires therapist to manually write all 5 levels; v3 wants AI-assisted draft from goal text
2. **GAS T-score periodic snapshot collection** (`GasScoreSnapshot` proposed in Phase A) — current implementation computes on demand, doesn't store periodic snapshots for trend visualization
3. **Linkage to ICF codes** — goals have GAS scales but not ICF code mapping
4. **Family-friendly interpretation layer** — Arabic narrative for families ("ابنك حقق ما هو متوقع ووصل لـ T = 53")
5. **Cross-discipline T-score aggregation** — composite is per-beneficiary; no cross-beneficiary or cross-branch aggregation

**Revised Phase A scope for GAS**: Extension wave only (~5 days), not a 2-week build.

**My v3 doc correction needed**:

- Phase A wave plan must reference the **existing** `gas.service.js` and `GasScale` model, not propose new ones
- ρ default in any new helper code should be 0.3 (matching existing convention), not 0.7
- The doc's "GAS T-Score Library" section in `PHASE_A_ICF_FOUNDATION.md` proposed building from scratch — replace with "extend existing"

---

### 1.3 Feature 3 — Causal Inference Engine

**Verdict**: ❌ **MISSING — Zero infrastructure**

**Confirmation**:

- No matches for: `causal`, `propensityScore`, `syntheticControl`, `difference-in-differences`, `DiD`, `counterfactual` in `backend/services/`, `backend/intelligence/`, `backend/models/`
- Only `simulator` references are unrelated (`access-review-simulator`)
- No statistical inference libraries integrated for causal estimation

**v3 plan stands as designed**: Phase D builds this from scratch over 8 weeks. See [`CAUSAL_INFERENCE_ENGINE.md`](CAUSAL_INFERENCE_ENGINE.md).

**Genuine dependency**: Phase D blocked until at least 6 months of operational data accumulates (insufficient donor pool otherwise).

---

### 1.4 Feature 4 — Adaptive Therapy Protocol (RL with guardrails)

**Verdict**: ⚠️ **PARTIAL — Behavior planning UI exists, no RL/adaptive engine**

**What was found**:

- `apps/web-admin/src/app/(dashboard)/behavior-plans` — behavior intervention plan UI (this is human-authored treatment plans, not RL)
- W339 plateau detection adapter exists in `backend/services/aiRecommendation-plateau-adapter.service.js` — closest existing analog
- W334 AI recommendation service produces prescriptive recommendations (Level 4 of intelligence stack)

**What's missing**:

- Reinforcement learning loop
- Multi-armed bandit selection
- Per-session adaptive parameter adjustment
- Safety guardrails for autonomous adaptation
- Distress detection triggering rollback

**v3 plan stands as designed**: Phase I — deferred under Option 4. This is correctly classified as long-term research-grade work, not immediate.

---

### 1.5 Feature 5 — Family Wellbeing Composite Index (WBCI)

**Verdict**: ⚠️ **PARTIAL — Caregiver Support (W384) exists; composite + sibling missing**

**What was found**:

- [`backend/models/CaregiverSupportProgram.js`](../../backend/models/CaregiverSupportProgram.js) (W384) — comprehensive caregiver support entity:
  - 5 program types: counseling, training, parent_support_group, sibling_support_group, peer_support
  - Zarit-22 Burden Score (pre + post outcomes)
  - Canonical schema present
  - Routes + tests
- Web admin: `apps/web-admin/src/app/(dashboard)/caregiver-support` + `lib/types/caregiver-burden.ts`

**What's covered**:

- Caregiver Burden tracking (Zarit-22)
- Sibling support programs **as a type** (but no separate sibling-specific tracking)
- Multiple program types

**What's missing (v3 additions)**:

1. **Composite WBCI formula** — current implementation has burden score only, not composite of (burden + sibling adjustment + financial stress + extended family engagement + family communication)
2. **Sibling Hub UX** — separate UX for healthy siblings, age-appropriate
3. **Financial Navigation module** — government benefits, insurance navigation
4. **Predictive triggering** — WBCI dropping → auto-trigger respite + counselling + peer mentor
5. **Family Mentorship Network** — peer family matching

**Revised Phase C scope**: 3 weeks (extends W384), down from 5 weeks.

**Wave plan adjustment**: W411-W420 should reference existing CaregiverSupportProgram model + Zarit-22 implementation.

---

### 1.6 Feature 6 — Federated Outcome Network

**Verdict**: ❌ **MISSING — Single-tenant only**

**Confirmation**:

- No matches for `federated`, `multiCenter`, `crossCenter`, `centerNetwork`
- Branch isolation exists (W269 series for cross-tenant) but no multi-center learning

**v3 plan stands as designed**: Phase H — 12 weeks, deferred under Option 4.

**Genuine dependencies**:

- Inter-center governance (legal + organizational)
- PDPL compliance review for cross-center model parameter sharing
- Disability Authority orchestration
- At least 3+ centers willing to participate

---

### 1.7 Feature 7 — Beneficiary Digital Twin

**Verdict**: ❌ **MISSING — Closest is access-review-simulator (unrelated)**

**Confirmation**:

- `access-review-simulator` is an authorization-domain tool, not a beneficiary twin
- No `digitalTwin`, `whatIf`, `counterfactualPrediction` matches

**v3 plan stands as designed**: Phase I — deferred under Option 4.

**Genuine dependency**: Requires Causal Engine (Phase D) + extensive multi-modal data.

---

### 1.8 Feature 8 — Story Architecture / Family Narrative

**Verdict**: ⚠️ **PARTIAL — Narrative engines exist, story book composition missing**

**What was found**:

- [`backend/services/clinicalReportNarrativeEngine.service.js`](../../backend/services/clinicalReportNarrativeEngine.service.js) (W257) — **deterministic slot-based narrative templates** covering 5 situations (SUSTAINED_IMPROVEMENT, PLATEAU, REGRESSION, etc.)
- [`backend/services/measureFamilyReport.service.js`](../../backend/services/measureFamilyReport.service.js) — family-friendly Arabic output, no clinical jargon
- [`backend/services/dashboardNarrative.service.js`](../../backend/services/dashboardNarrative.service.js)
- [`backend/services/llmNarrativeGenerator.service.js`](../../backend/services/llmNarrativeGenerator.service.js) — LLM-based generation
- [`backend/services/ai/rag.service.js`](../../backend/services/ai/rag.service.js) (W283)
- Routes + registry

**What's covered**:

- Deterministic slot-based templates (W257)
- LLM-based narrative generation
- Family-friendly Arabic output
- Plateau/regression/improvement scenarios

**What's missing (v3 additions)**:

1. **Quarterly Story Book composition** — visual + text package, not just narrative
2. **Annual Life Chronicles** — beneficiary-facing, voice-first
3. **Multi-surface narrative variants** — 7 different audience versions of same data
4. **Sibling Story version** — for healthy siblings, no stigma
5. **Pride Moment extraction** — automatic identification of pride-worthy events
6. **Visual generation** — timeline graphics, before/after composites

**Revised Phase F scope**: 3 weeks (extends existing narrative engines), down from 5 weeks.

---

### 1.9 Feature 9 — Independent Advocate Role + Rights Module + Beneficiary Voice

**Verdict**: ❌ **MISSING — No advocate role, no CRPD module, no voice channel**

**Confirmation**:

- [`backend/config/constants/roles.constants.js`](../../backend/config/constants/roles.constants.js) canonical roles: super_admin, admin, manager, supervisor, doctor, therapist, nurse, dpo, patient_relations_officer, crmm_supervisor — **no advocate**
- No matches for: `independentAdvocate`, `advocate`, `rightsModule`, `beneficiaryVoice`, `voiceChannel`, `selfAdvocacy`, `CRPD`
- No CRPD compliance dashboard
- No rights education curriculum
- No supported decision-making workflow

**Indirect proxies**:

- [`backend/models/SafeguardingConcern.js`](../../backend/models/SafeguardingConcern.js) (W357) — has CBAHI + PDPL compliance but not CRPD-explicit
- `patient_relations_officer` role partially covers complaints but is not an independent advocate
- DPO role covers data rights but not broader CRPD rights

**v3 plan stands as designed**: Phase B — 4 weeks, full build required.

**This is the highest-priority gap by ethics/legal weight**: CRPD is binding in Saudi Arabia since 2008. Absence of explicit compliance infrastructure is a strategic + legal vulnerability.

---

### 1.10 Feature 10 — Cultural Intelligence Layer

**Verdict**: ❌ **MISSING — Hijri converter only**

**Confirmation**:

- DateConverterService exists for Gregorian↔Hijri conversion (W?? — pre-existing)
- No matches for: `prayerTime`, `salah`, `ramadan`, `culturalProfile`, `genderPreference`, `modesty`, `mahram`
- No prayer-aware scheduling
- No Ramadan protocol adjustments
- No therapist gender routing
- No modesty accommodations
- No family structure modeling (multi-generational decision rights)

**v3 plan stands as designed**: Phase E — 4 weeks, full build required.

**Why this is high-value**:

- Most globally-available rehab platforms lack Saudi cultural fit
- Building this creates a competitive moat
- Addresses 70%+ of "soft" cultural friction sources in operations

---

### 1.11 Bonus — Equity Engine

**Verdict**: ❌ **MISSING — Zero infrastructure**

**Confirmation**:

- No matches for `equity`, `disparity`, `equityDashboard` in intelligence or services layer

**v3 plan stands as designed**: Phase G — 4 weeks.

**Dependency**: Phase A (ICF) is helpful prerequisite (need standardized outcomes to detect disparities), and 6+ months of data.

---

### 1.12 Bonus — Crisis Pathway

**Verdict**: ✅ **EXISTS (models) — Pathway integration missing**

**What was found**:

- [`backend/models/SeizureEvent.js`](../../backend/models/SeizureEvent.js) (W356) — ILAE classification, consciousness, duration (status epilepticus virtual ≥300s), rescue meds, frequency analytics
- [`backend/models/SafeguardingConcern.js`](../../backend/models/SafeguardingConcern.js) (W357) — intake-to-closure workflow, external reporting, CBAHI + PDPL compliance
- Both have canonical schemas, routes, tests, middleware hooks

**What's missing (v3 additions)**:

1. **CrisisIncident unified entity** — currently 2 separate entities (Seizure + Safeguarding); v3 wants unified Crisis pathway covering medical + behavioral + family + environmental + system crisis types
2. **EmergencyPlan per beneficiary** — pre-built crisis protocols per beneficiary
3. **EscalationChain** — who calls whom in what order
4. **PostIncidentReview workflow** — extends W193e RCA + FMEA but as crisis-specific workflow

**Revised approach**: Add a thin orchestration layer over existing Seizure + Safeguarding models rather than rebuilding from scratch. ~1 week effort.

---

## 2. Wave Number Conflicts & Discoveries

During the audit, several **W### references in the v3 design need correction**:

| v3 doc reference                          | Reality                                                | Correction needed                               |
| ----------------------------------------- | ------------------------------------------------------ | ----------------------------------------------- |
| W391+ proposed for ICF Foundation         | ICF was built in earlier waves (pre-W340)              | Phase A is **extension**, not fresh build       |
| W391+ proposed for GAS T-score            | GAS T-score built in **W264**                          | Phase A references existing W264 service        |
| W411-W420 proposed for Family Wellbeing   | Caregiver support built in **W384**                    | Phase C extends W384                            |
| W446-W455 proposed for Story Architecture | Clinical narrative engine built in **W257** + W283 RAG | Phase F extends existing                        |
| Implicit Crisis pathway proposed          | W356 Seizure + W357 Safeguarding exist                 | Phase F (crisis dimension) is integration layer |

**Action**: Revise PHASE_A_WAVES_W391_W400.md to reflect these realities (next document).

---

## 3. Per-Innovation Detailed Effort Estimates

| #   | Innovation                     | Original v3 Estimate | Audit Finding       | Revised Estimate         | Status               |
| --- | ------------------------------ | -------------------- | ------------------- | ------------------------ | -------------------- |
| 1   | ICF-Mapped Goals + GAS T-Score | 6 weeks              | Both fully exist    | **5 days extension**     | Quick win            |
| 2   | Causal Outcome Engine          | 8 weeks              | Missing             | 8 weeks                  | Deferred (Phase D)   |
| 3   | Adaptive Therapy RL            | 16+ weeks            | Missing             | 16+ weeks                | Deferred (Phase I)   |
| 4   | Family WBCI                    | 5 weeks              | W384 partial        | **3 weeks extension**    | Phase C              |
| 5   | Federated Network              | 12 weeks             | Missing             | 12 weeks                 | Deferred (Phase H)   |
| 6   | Digital Twin                   | 16+ weeks            | Missing             | 16+ weeks                | Deferred (Phase I)   |
| 7   | Story Architecture             | 5 weeks              | W257 + W283 partial | **3 weeks extension**    | Phase F              |
| 8   | Independent Advocate + Rights  | 4 weeks              | Missing             | 4 weeks                  | Phase B (priority)   |
| 9   | Cultural Intelligence          | 4 weeks              | Hijri only          | 4 weeks                  | Phase E              |
| 10  | Equity Engine                  | 4 weeks              | Missing             | 4 weeks                  | Phase G              |
| +   | Crisis Pathway integration     | (implicit)           | Models exist        | **1 week orchestration** | Quick win            |
| +   | Sibling Hub UX                 | (in Phase C)         | Missing             | 2 weeks                  | Phase C-extension    |
| +   | Financial Navigator            | (in Phase C)         | Missing             | 2 weeks                  | Phase C-extension    |
| +   | Provider Wellbeing tracking    | (mentioned)          | Missing             | 2 weeks                  | Phase H or new phase |

---

## 4. Reordered Implementation Priority

Based on this audit, here's the **revised priority** for Option 4 (v3 Lite) — 22 weeks total:

### Tier 1 — Quick Wins (Weeks 1-3, prove value fast)

| Week | Phase | Activity                                                                                                                      | Effort |
| ---- | ----- | ----------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1    | A-ext | ICF + GAS extensions (add Core Sets, AI scale-construction, snapshot collection, family interpretation, cross-domain linkage) | 5 days |
| 1    | F-int | Crisis pathway orchestration over existing W356 + W357 models                                                                 | 5 days |
| 2    | F-ext | Story Architecture extensions (Quarterly Story Book composition + 7-surface variants)                                         | 1 week |
| 3    | F-ext | Pride moment extraction + visual generation hooks                                                                             | 1 week |

### Tier 2 — Strategic Builds (Weeks 4-15, ~12 weeks)

| Week  | Phase | Activity                                                       | Effort  |
| ----- | ----- | -------------------------------------------------------------- | ------- |
| 4-7   | B     | Independent Advocate + Rights Module + CRPD Compliance         | 4 weeks |
| 8-10  | C-ext | Family WBCI composite + Sibling Hub + Financial Navigator      | 3 weeks |
| 11-14 | E     | Cultural Intelligence (prayer/Ramadan/gender/family-structure) | 4 weeks |

### Tier 3 — Foundation for Future (Weeks 16-22)

| Week  | Phase         | Activity                                                                              | Effort  |
| ----- | ------------- | ------------------------------------------------------------------------------------- | ------- |
| 16-19 | G             | Equity Engine + Disparity Detection (requires Tier 1 + 2 data)                        | 4 weeks |
| 20-22 | Stabilization | Integration testing, documentation, therapist training, family rollout communications | 3 weeks |

### Deferred to Phase H+ (Post-Option 4)

- Causal Inference Engine (8 weeks) — requires data accumulation first
- Federated Network (12 weeks) — requires inter-center governance + multi-tenant data
- Digital Twin (16+ weeks) — requires Causal + multi-modal data
- Adaptive Therapy RL (16+ weeks) — requires Digital Twin foundation

---

## 5. Critical Open Items Surfaced by Audit

### 5.1 Wave-numbering inflation risk

The v3 docs proposed W391+ throughout. Current actual: latest wave numbers are W408-W410-ish based on memory. Wave numbering is finite and meaningful. **Action**: confirm next available wave number with `git log --oneline -30 | grep -oE 'W[0-9]+' | sort -u | tail -10` before each new wave commit.

### 5.2 ICF Core Sets — translation gap

The existing `ICFCodeReference` model has Arabic + English fields, but the audit didn't verify **how many codes are populated**. May need a seeding wave to load WHO Core Sets if not present.

**Action item**: `db.icfcodereferences.countDocuments()` + sample inspection to assess coverage before adding Core Sets.

### 5.3 GAS rho convention

Existing code uses ρ = 0.3 (Kiresuk's default for unrelated clinical goals). v3 doc proposed ρ = 0.7 (variant from care-coordination literature). **Decision**: stick with existing 0.3 unless clinical leadership prefers re-calibration; ρ is a single constant easy to change, but consistency matters more than the specific value.

### 5.4 ICF profile vs assessment

Existing `ICFAssessment` is event-driven (a snapshot at assessment time). v3 introduces `IcfProfile` as a separate concept (point-in-time aggregated state). **Decision**: do we need a separate model, or extend `ICFAssessment` with a `profileSnapshot: boolean` flag?

**Recommendation**: extend existing model. Avoid model proliferation. See ADR-021 framework for the consolidation pattern.

### 5.5 Independent Advocate — sourcing path

Phase B requires an Independent Advocate role. The audit confirmed it doesn't exist in canonical roles. **Open question for stakeholders** (already in ADR-031 Q2): who sources advocates (NGO/government/internal independent)?

This needs resolution **before** Phase B can begin coding.

### 5.6 Cultural Intelligence — pilot region

Phase E's cultural layer is broad. **Practical question**: do we build for all Saudi regions at once, or pilot in one (e.g., Riyadh) then expand?

**Recommendation**: pilot Najdi dialect + Hanafi/Hanbali religious conventions first, then expand to Hejazi/Eastern/Southern.

---

## 6. Tests & Drift Guards Needed

Beyond the new code, several **drift guards** must be added to lock the v3 architecture against regression:

### 6.1 ICF integration drift guard (W392-equivalent extension)

```javascript
// __tests__/icf-integration-coverage-wave-XYZ.test.js
// Asserts:
// - All new CarePlanGoals have ICF codes (with grace period for existing)
// - All new MeasureRecords map to ICF qualifiers
// - All Core Sets have ≥80% Arabic translation coverage
```

### 6.2 GAS scale coverage drift guard

```javascript
// __tests__/gas-scale-coverage-wave-XYZ.test.js
// Asserts:
// - All new active CarePlanGoals have GAS scales OR exemption
// - GAS scoring is recorded at quarterly minimum per active scale
```

### 6.3 CRPD compliance drift guard (Phase B)

```javascript
// __tests__/crpd-compliance-wave-XYZ.test.js
// Asserts:
// - Every Beneficiary has DecisionRightsAssessment
// - Every active episode has assigned Independent Advocate (or opt-out documented)
// - Restraint events trigger Advocate notification
// - Substituted-decision events documented with capacity assessment
```

### 6.4 Family Wellbeing Composite drift guard

```javascript
// __tests__/family-wbci-coverage-wave-XYZ.test.js
// Asserts:
// - Every active Beneficiary has WBCI snapshot ≥ quarterly
// - WBCI components present: caregiver burden + sibling adjustment + financial + extended + communication
// - Triggers fire when WBCI < threshold for 2 consecutive months
```

### 6.5 Cultural Intelligence drift guard

```javascript
// __tests__/cultural-intelligence-coverage-wave-XYZ.test.js
// Asserts:
// - Every Beneficiary has CulturalProfile (or opt-out documented)
// - Schedule respects prayer times (no session within 15 min of prayer)
// - Ramadan protocol active when current Hijri date in Ramadan
// - Gender preferences respected (mismatch requires documented exception)
```

### 6.6 Equity disparity detection drift guard

```javascript
// __tests__/equity-engine-monitoring-wave-XYZ.test.js
// Asserts:
// - Disparity computations run weekly
// - Alerts generated when statistically significant disparity detected
// - All monitored dimensions covered (income proxy / region / gender / severity / type / age / nationality)
```

---

## 7. What This Means for the v3 Documents

### 7.1 Revisions needed to `beneficiary-lifecycle-v3.md`

- §6 Innovation 1 (ICF-Mapped Goal Architecture + GAS T-Score): change "Phase A (W391-W400)" to "Phase A extension (~1 week)". Reference existing W264 + ICF service.
- §6 Innovation 4 (Family WBCI): change "extends W384" to specifically cite `CaregiverSupportProgram` + Zarit-22 + add composite layer.
- §6 Innovation 7 (Story Architecture): reference existing W257 narrative engine + W283 RAG.
- §11 Implementation Roadmap: revise effort estimates per Table 0 above.

### 7.2 Revisions needed to `031-beneficiary-lifecycle-v3-architecture.md` (ADR)

- §Decision Outcome: noting Option 4 reduced from 28 to ~22 weeks per audit.
- Add §Reversibility row for "ICF integration: SOFT reverse (the foundation exists, we add usage)".

### 7.3 Revisions needed to `PHASE_A_ICF_FOUNDATION.md`

This document had the most assumptions invalidated. Major revisions:

- §4 Database Schema — remove proposed new `IcfCode` model (exists as `ICFCodeReference`). Remove new `IcfProfile` (extend `ICFAssessment` instead).
- §5 GAS Library — remove proposed new `gas-tscore.lib.js`. Reference existing `gas.service.js`. Note ρ = 0.3 is the established convention.
- §6 APIs — remove proposed new APIs that already exist. Add only the genuinely new endpoints (Core Set seeding, AI-assisted scale construction, family interpretation layer).
- §10 Wave-by-Wave Plan — reduce from 10 waves to ~3 extension waves.

### 7.4 Revisions needed to `CAUSAL_INFERENCE_ENGINE.md`

No major revisions — Causal Engine is confirmed missing. Document stands as designed for Phase D deferred.

### 7.5 New revisions for Phase A Wave Plan (next document)

The next document (Phase A Waves W### plan) must be written **with the audit findings baked in** — referencing existing services + extending them, rather than proposing a fresh build.

---

## 8. Methodological Reflection

This audit reinforces the W356-W370 lesson: **always grep before scoping**. Sequence:

1. **Initial v3 design** (without audit) assumed ICF + GAS + caregiver support + narrative engines all needed to be built from scratch. Estimated 64 weeks total or 28 weeks Option 4.
2. **This audit** revealed 2 of 10 innovations fully exist, 3 partially exist with substantial foundation. Revised Option 4 to ~22 weeks.
3. **Effort savings**: ~6 weeks (21%).
4. **Quality improvement**: by extending existing work, integration risk drops and code consistency improves.

The CLAUDE.md memory entry [`feedback_audit_doctrine_prompts_against_source`](../../~/.claude/projects/c--Users-x-be-OneDrive-----------04-10-2025-66666/memory/feedback_audit_doctrine_prompts_against_source.md) explicitly mandates this discipline: _"Audit doctrine prompts against source — 09-integration-map shipped wrong event-bus paths, fix commit required. Doctrine prompts have no CI; prose drifts silently."_

The v3 lifecycle doc and ADR-031 effectively are "doctrine prompts" until reviewed against source. This audit is the source-reconciliation pass.

---

## 9. Document History

- **2026-05-26**: Initial audit performed during v3 design session.
- **Next**: Phase A Wave Plan (W### TBD based on git log audit) — informed by these findings.
