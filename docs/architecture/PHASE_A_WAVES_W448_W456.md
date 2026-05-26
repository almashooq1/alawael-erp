# Phase A — Wave Plan W448-W459 (Final)

> **Date**: 2026-05-26  
> **Status**: ✅ **COMPLETE** — all 9 Phase A waves shipped 2026-05-26 across W448 + W452-W459. 353 tests passing in CI sprint (~3.1s).  
> **Replaces**: the originally-planned `PHASE_A_WAVES_W391_W400.md` (renamed/revised after audit)  
> **Scope**: Tier 1 quick wins identified by `GAP_ANALYSIS_LIFECYCLE_V3.md` — ICF extensions + GAS T-score enhancements + Crisis pathway orchestration  
> **Duration**: ~3 weeks (15-20 work days)  
> **Wave numbers**: W448-W456 (9 waves, derived from latest commit W447 verified `git log` 2026-05-26)

---

## 0. Audit-First Discipline Applied

Per [`GAP_ANALYSIS_LIFECYCLE_V3.md`](GAP_ANALYSIS_LIFECYCLE_V3.md), Phase A was originally scoped at **6 weeks of fresh build**. The codebase audit revealed:

- **ICF**: fully exists ([`models/icf/`](../../backend/models/icf/) + [`services/icfAssessment.service.js`](../../backend/services/icfAssessment.service.js))
- **GAS T-score**: fully exists ([`services/gas.service.js`](../../backend/services/gas.service.js), built in W264)
- **Crisis models**: W356 SeizureEvent + W357 SafeguardingConcern exist

**Revised Phase A = extensions + integration + orchestration**, not new builds. Reduces effort from 6 weeks to ~3 weeks. Quality also improves because we leverage proven existing infrastructure rather than parallel rebuilds.

---

## 1. Wave Summary Table

| Wave                | Title                                               | Tier  | Days | Risk    | Type                        | Status                                                   |
| ------------------- | --------------------------------------------------- | ----- | ---- | ------- | --------------------------- | -------------------------------------------------------- |
| **W448**            | ICF Core Sets seeding                               | A-ext | 2    | Low     | Data/seed                   | ✅ shipped 2026-05-26 (`26209cea1`)                      |
| ~~W449~~ → **W452** | CarePlanGoal ↔ ICF code linkage                    | A-ext | 2    | Low     | Schema extension            | ✅ shipped 2026-05-26 (`c70935c96`)                      |
| ~~W450~~ → **W453** | MeasurementMaster ↔ ICF qualifier mapping          | A-ext | 2    | Low-Med | Schema + lib extension      | ✅ shipped 2026-05-26 (`3c0862bae`)                      |
| ~~W451~~ → **W454** | GAS scale AI-assisted construction helper           | A-ext | 1    | Low     | Service addition            | ✅ shipped 2026-05-26 (`8d973e2d2`)                      |
| ~~W452~~ → **W455** | GAS T-score periodic snapshot collection            | A-ext | 2    | Low     | New collection + cron       | ✅ shipped 2026-05-26 (`846a149cd`)                      |
| ~~W453~~ → **W456** | Family-friendly GAS interpretation layer (Arabic)   | A-ext | 1    | Low     | Service addition            | ✅ shipped 2026-05-26 (`0d53d3f95`)                      |
| ~~W454~~ → **W457** | ICF profile aggregation reports (branch + national) | A-ext | 2    | Med     | Service + APIs              | ✅ shipped 2026-05-26 (`27c9f4fab`)                      |
| ~~W455~~ → **W458** | Crisis pathway orchestration over W356/W357         | F-int | 3    | Med     | New orchestrator + workflow | ✅ shipped 2026-05-26 (`9bc0445d2`+`bd51e9931` followup) |
| ~~W456~~ → **W459** | Phase A smoke + drift guards + sprint-tests update  | A-ext | 1    | Low     | Tests + CI                  | ✅ shipped 2026-05-26 (this commit)                      |

**Total**: 16 work days ≈ 3.5 weeks at 1 FTE, ~2 weeks at 2 FTE.

> **Wave-collision note (2026-05-26)**: W448 shipped at commit `26209cea1`. A parallel security agent claimed W449 at `05c482bd2` for cross-tenant IDOR fix on disability-cards + kpi-reports (orthogonal scope, NOT the CarePlanGoal ICF linkage planned here). Phase A remaining 8 waves shift by +1 → **W450-W457**. Per the CLAUDE.md atomic-commit-pattern doctrine, re-verify the next available wave with `git log --oneline -20 \| grep -oE 'W[0-9]+' \| sort -un \| tail -5` immediately before each new wave commit. Document filename retained as `PHASE_A_WAVES_W448_W456.md` for backlink continuity even though the range is now W448 + W450-W457.

---

## 2. Wave-by-Wave Detail

### W448 — ICF Core Sets Seeding

**Goal**: Ensure WHO ICF Core Sets are loaded into `ICFCodeReference` collection. Current state: model exists, but code coverage and Core Set memberships unknown.

**Pre-flight check**:

```bash
# Count existing codes
mongo --eval 'db.icfcodereferences.countDocuments()'
# Sample 10
mongo --eval 'db.icfcodereferences.find().limit(10)'
# Check Arabic translation coverage
mongo --eval 'db.icfcodereferences.countDocuments({titleAr: {$exists: true, $ne: ""}})'
```

**Scope**:

If <200 codes exist → **full seed**: load WHO ICF 2017 (b/s/d/e components) Brief Core Sets for 10 prioritized conditions + Generic Brief Core Set + top 100 individual codes (~410 codes total). Source: curated JSON from WHO ICF Browser + Arabic translations (multi-source — MOH + Disability Authority + community).

If 200-1000 codes exist → **augmentation**: add Core Set membership tags + missing Arabic translations + missing Brief Core Sets.

If >1000 codes exist → **verification only**: smoke-check coverage, add missing Core Set tags.

**Schema additions to `ICFCodeReference`** (additive only):

```javascript
// Add field if not present:
{
  coreSetMemberships: [{
    setName: { type: String },         // e.g., 'CP_brief', 'ASD_comprehensive'
    setVersion: { type: String },
    isCanonical: { type: Boolean }     // is this part of the official WHO Core Set?
  }],
  isCyOnly: { type: Boolean, default: false }
}
```

**Files**:

- New: `backend/scripts/seed-icf-codes.js`
- New: `backend/intelligence/icf/core-sets/cp-brief.json`, `cp-comprehensive.json`, `asd-brief.json`, etc. (10 files)
- New: `backend/intelligence/icf/core-sets/generic-brief.json`
- Extension: `backend/models/icf/ICFCodeReference.model.js` (add `coreSetMemberships`, `isCyOnly` fields)
- Extension: `backend/package.json` `scripts`: add `"seed:icf-codes": "node scripts/seed-icf-codes.js"`

**Acceptance criteria**:

- ✅ Script idempotent (re-run produces 0 new docs)
- ✅ Supports `--update` flag for refreshing translations
- ✅ Supports `--core-sets-only` flag for partial runs
- ✅ Logs summary: created vs updated vs unchanged counts
- ✅ All 10 starter Core Sets present + 100% Arabic translation coverage on starter set
- ✅ Drift guard test verifies Core Set integrity

**Tests** (new):

- `backend/__tests__/icf-core-sets-seeding-wave448.test.js`: ~12 assertions
  - Idempotency
  - Core Set membership structure validation
  - Arabic translation presence
  - Component coverage (b/s/d/e all represented)

**Risk**: Low. Pure data layer addition, no behavior change.

---

### W449 — CarePlanGoal ↔ ICF Code Linkage

**Goal**: Allow CarePlanGoals to carry one or more ICF codes, marking primary vs contributory.

**Pre-flight check**:

```bash
# Verify CarePlanGoal model exists + has expected shape
grep -l "mongoose.model('CarePlanGoal'" backend/models/
```

**Schema extension to `CarePlanGoal`** (additive, backward-compat):

```javascript
{
  // Existing fields preserved...

  icfMapping: [{
    icfCode: {
      type: String,
      validate: {
        validator: async function(v) {
          const ICFCodeReference = mongoose.model('ICFCodeReference');
          const exists = await ICFCodeReference.exists({ code: v, isActive: true });
          return !!exists;
        },
        message: 'ICF code does not exist in reference catalog'
      }
    },
    isPrimary: { type: Boolean, default: false },
    targetQualifier: { type: Number, min: 0, max: 4 },
    baselineQualifier: { type: Number, min: 0, max: 4 },
    addedAt: { type: Date, default: Date.now },
    addedBy: { type: ObjectId, ref: 'User' }
  }],

  // Invariant: at most ONE icfMapping entry may have isPrimary: true
  __invariants: 'virtual'  // via path validation
}
```

**Wave-18 invariants**:

- At most one entry with `isPrimary: true`
- All `icfCode` values must exist in `ICFCodeReference` (async validator)
- If any `targetQualifier` provided, `baselineQualifier` must also be provided

**API additions**:

```javascript
POST   /api/care-plan-goals/:id/icf-mapping
       Add ICF code to goal
       MFA: tier 1
       Body: { icfCode, isPrimary, targetQualifier, baselineQualifier }

DELETE /api/care-plan-goals/:id/icf-mapping/:icfCode
       Remove ICF mapping
       MFA: tier 2 (changing established structure)

PATCH  /api/care-plan-goals/:id/icf-mapping/:icfCode/primary
       Mark this ICF code as primary (auto-demotes any other primary)
       MFA: tier 1
```

**Files**:

- Extension: `backend/models/CarePlan.js` (or `backend/models/CarePlanGoal.js` depending on existing structure)
- Extension: `backend/services/carePlan.service.js`
- Extension: `backend/routes/carePlan.routes.js`
- New tests: ~15 assertions

**Tests** (new):

- `backend/__tests__/care-plan-goal-icf-mapping-wave449.test.js`
  - Add/remove ICF mapping
  - Primary constraint (only one primary)
  - Validator: ICF code must exist
  - Validator: target requires baseline

**Drift guard**:

- `backend/__tests__/care-plan-goal-icf-coverage-wave449.test.js`
  - For new goals created post-launch, percentage with ICF mapping (target: ≥80% within 30 days)
  - Currently a "soft" guard — warns, doesn't fail CI

**Risk**: Low. Optional field, backward-compatible.

---

### W450 — MeasurementMaster ↔ ICF Qualifier Mapping

**Goal**: Connect existing measure library to ICF qualifiers. Each measure can carry a default ICF mapping + qualifier algorithm.

**Schema extension to `MeasurementMaster`**:

```javascript
{
  // Existing fields preserved...

  defaultIcfMapping: {
    primary: { type: String },          // primary ICF code
    secondary: [String],
    qualifierAlgorithm: {
      type: String,
      enum: ['direct_5_band', 'inverse_5_band', 'threshold_based', 'manual'],
      default: 'manual'
    },
    qualifierBands: [{
      minValue: { type: Number },
      maxValue: { type: Number },
      qualifier: { type: Number, min: 0, max: 4 }
    }]
  }
}
```

**New pure library**: `backend/intelligence/icf-qualifier-mapping.lib.js`

```javascript
'use strict';

/**
 * Map a numeric measure value to ICF qualifier (0-4).
 * Pure function — no Mongoose, no DB. Fully unit-testable.
 */
function mapValueToQualifier(value, mapping) {
  if (mapping.qualifierAlgorithm === 'manual') return null;
  if (typeof value !== 'number' || isNaN(value)) return null;
  if (!Array.isArray(mapping.qualifierBands) || !mapping.qualifierBands.length) return null;

  for (const band of mapping.qualifierBands) {
    if (value >= band.minValue && value <= band.maxValue) {
      return { qualifier: band.qualifier, confidence: 'high' };
    }
  }
  return null; // value out of all bands
}

// ... more pure helpers

module.exports = Object.freeze({
  mapValueToQualifier,
  // ...
});
```

**Schema extension to `MeasureRecord`**:

```javascript
{
  // Existing preserved...

  icfQualifier: {
    code: { type: String },           // primary ICF code
    qualifierBefore: { type: Number, min: 0, max: 4 },
    qualifierAfter: { type: Number, min: 0, max: 4 },
    confidence: { type: String, enum: ['high', 'medium', 'low'] },
    mappedAutomatically: { type: Boolean, default: false },
    mappedAt: { type: Date }
  }
}
```

**Service hook**: On `MeasureRecord` save, attempt to auto-populate `icfQualifier` from the measure's `defaultIcfMapping` if both `previousValue` and `currentValue` are numeric.

**Files**:

- Extension: `backend/models/MeasurementMaster.js` (model file path may vary)
- Extension: `backend/models/MeasureRecord.js`
- New: `backend/intelligence/icf-qualifier-mapping.lib.js`
- Extension: `backend/services/measure.service.js` — add pre-save hook
- Seed extension: `backend/scripts/seed-measure-icf-mappings.js` (proposes mappings, requires review before apply)

**Tests**:

- `backend/__tests__/icf-qualifier-mapping-wave450.test.js` (~20 assertions): pure-lib tests
- `backend/__tests__/measure-record-icf-population-wave450.test.js` (~10 assertions): integration

**Drift guard**:

- `backend/__tests__/measurement-master-icf-coverage-wave450.test.js`: every active MeasurementMaster has `defaultIcfMapping` OR explicit `defaultIcfMapping.qualifierAlgorithm: 'manual'` exemption. Failures listed by measure name.

**Risk**: Medium. Touches measure record save path — must verify hook doesn't break existing measure recording. Mitigation: hook is fail-safe (errors log + skip, don't block save).

---

### W451 — GAS Scale AI-Assisted Construction Helper

**Goal**: Reduce therapist time to construct 5-level GAS scales from goal text.

**Current state**: `gas.service.js::createScale` requires therapist to provide all 5 level descriptions manually.

**Addition**: Helper method `proposeScaleFromGoalText(goalText, opts)` that produces draft 5-level scale for therapist review/editing.

**Approach (per ADR-011 heuristic-first, ML optional)**:

- **Heuristic v1**: extract verbs + measurable nouns from goal text; produce templated levels:
  - `-2`: "Cannot {verb} {noun} even with maximal support"
  - `-1`: "Performs {verb} {noun} with significant support"
  - `0`: "{goal text as written}"
  - `+1`: "Exceeds goal by ~25% (e.g., {variant})"
  - `+2`: "Independently performs {verb} {noun} consistently"
- **LLM v2** (optional, opt-in per ADR-012): use [RAG service](../../backend/services/ai/rag.service.js) to retrieve similar past goals + scales, then prompt LLM to adapt.

**Pure-lib pattern**:

```javascript
// backend/intelligence/gas-scale-builder.lib.js
'use strict';

function proposeScaleHeuristic(goalText, opts = {}) {
  // ... heuristic extraction
  return {
    minus2: '...',
    minus1: '...',
    zero: '...', // = goalText
    plus1: '...',
    plus2: '...',
    confidence: 'medium',
    method: 'heuristic-v1',
  };
}

async function proposeScaleLLM(goalText, opts = {}) {
  // ... LLM call with safety guardrails
  // Returns draft + confidence + method: 'llm-v1' or 'llm-fallback-heuristic'
}

module.exports = Object.freeze({
  proposeScaleHeuristic,
  proposeScaleLLM,
});
```

**API addition**:

```javascript
POST /api/gas/scales/propose
     Propose a GAS scale draft (does not save)
     Body: { goalText, beneficiaryId?, mode: 'heuristic' | 'llm' }
     Returns: { proposedScale, method, confidence, citations? }
     MFA: tier 1
```

**Acceptance criteria**:

- ✅ Heuristic produces valid 5-level structure for any goal text
- ✅ LLM mode falls back to heuristic on error
- ✅ Never auto-saves — therapist must review + accept
- ✅ Audit trail records which method produced the accepted scale (for quality monitoring)

**Files**:

- New: `backend/intelligence/gas-scale-builder.lib.js`
- Extension: `backend/services/gas.service.js` — add `proposeScale()` method (delegates to lib)
- Extension: `backend/routes/gas.routes.js` — add `POST /scales/propose`

**Tests**:

- `backend/__tests__/gas-scale-builder-wave451.test.js` (~15 assertions): heuristic correctness, edge cases (empty, very short, very long text)

**Risk**: Low. Doesn't modify save path; opt-in helper only.

---

### W452 — GAS T-Score Periodic Snapshot Collection

**Goal**: Collect T-score snapshots periodically (not just on-demand) so trends are visualized efficiently.

**Current state**: `gas.service.js::computeBeneficiaryComposite` calculates T-score on demand. No persistent snapshot.

**Addition**: New collection `GasScoreSnapshot` + cron job (env-gated) to compute snapshots weekly + on session.

**Schema (new model)**:

```javascript
// backend/models/GasScoreSnapshot.js
const GasScoreSnapshotSchema = new Schema(
  {
    beneficiaryId: { type: ObjectId, ref: 'Beneficiary', required: true, index: true },
    branchId: { type: ObjectId, ref: 'Branch', required: true, index: true },
    episodeOfCareId: { type: ObjectId, ref: 'EpisodeOfCare', index: true },
    snapshotDate: { type: Date, required: true, index: true },
    snapshotType: {
      type: String,
      enum: ['session', 'weekly', 'monthly', 'quarterly', 'annual', 'ad-hoc'],
      required: true,
    },
    tScore: { type: Number, required: true },
    ci95Lower: { type: Number },
    ci95Upper: { type: Number },
    goalCount: { type: Number, required: true },
    totalWeight: { type: Number, required: true },
    rhoUsed: { type: Number, default: 0.3 }, // record convention used
    calculationVersion: { type: String, default: 'v1' },
    triggeredBy: { type: String, enum: ['cron', 'manual', 'session', 'event'] },
    triggeredById: { type: ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'gas_score_snapshots',
  },
);

GasScoreSnapshotSchema.index({ beneficiaryId: 1, snapshotDate: -1 });
GasScoreSnapshotSchema.index({ branchId: 1, snapshotDate: -1, snapshotType: 1 });
```

**Bootstrap pattern** (per CLAUDE.md):

- New: `backend/startup/gasSnapshotBootstrap.js` with `wireGasSnapshots(app, {logger})`
- Env-gated: `ENABLE_GAS_SNAPSHOT_CRON=true`
- Branch-scoped: `GAS_SNAPSHOT_BRANCH_IDS=b1,b2`
- Asia/Riyadh timezone
- Weekly snapshot: every Friday 03:00 (post-W278 atomic-commit pattern)

**Cron logic**:

```javascript
async function weeklySnapshot(branchIds) {
  for (const branchId of branchIds) {
    const beneficiaries = await Beneficiary.find({ branchId, status: 'active' }).select('_id');
    for (const b of beneficiaries) {
      try {
        const composite = await gasService.computeBeneficiaryComposite(b._id);
        if (composite.tScore != null) {
          await GasScoreSnapshot.create({
            beneficiaryId: b._id,
            branchId,
            snapshotDate: new Date(),
            snapshotType: 'weekly',
            tScore: composite.tScore,
            ci95Lower: composite.ci95Lower,
            ci95Upper: composite.ci95Upper,
            goalCount: composite.goalCount,
            totalWeight: composite.totalWeight,
            triggeredBy: 'cron',
          });
        }
      } catch (err) {
        logger.warn(`GAS snapshot failed for ${b._id}: ${err.message}`);
      }
    }
  }
}
```

**API addition**:

```text
GET /api/beneficiaries/:id/gas-progression
    Returns T-score progression over time (from snapshots)
    Query: from, to, granularity
    Returns: [GasScoreSnapshot, ...]
```

**Files**:

- New: `backend/models/GasScoreSnapshot.js`
- New: `backend/startup/gasSnapshotBootstrap.js`
- Extension: `backend/app.js` — wire bootstrap after `wireRag`
- Extension: `backend/services/gas.service.js` — `getProgression(beneficiaryId, range)` reads from snapshots
- Extension: `backend/routes/gas.routes.js` — add `/progression` endpoint

**Tests**:

- `backend/__tests__/gas-snapshot-creation-wave452.test.js` (~12 assertions)
- `backend/__tests__/gas-snapshot-cron-wave452.test.js` (~8 assertions): cron registration + env gate

**Drift guard**:

- `backend/__tests__/gas-snapshot-bootstrap-wave452.test.js`: verifies `wireGasSnapshots` registered in app.js

**Risk**: Low. New collection, additive.

---

### W453 — Family-Friendly GAS Interpretation Layer (Arabic)

**Goal**: Translate T-score numbers into Arabic narratives for families.

**Current state**: `gas.service.js` returns numeric T-score. No interpretation layer for non-clinical audiences.

**Addition**: Pure-lib + service method producing Arabic interpretation.

**Examples**:

- T = 53 → "ابنك حقق ما هو متوقع وزاد قليلاً عن التوقعات (T = 53)"
- T = 62 → "تقدّم رائع! ابنك فاق التوقعات بشكل ملحوظ (T = 62). هذا يعني تحقق متعدد للأهداف"
- T = 38 → "التقدم أبطأ مما توقعنا (T = 38). سنراجع الخطة في الاجتماع القادم"

**Pure-lib**:

```javascript
// backend/intelligence/gas-interpretation.lib.js
function interpretForFamily(tScore, opts = {}) {
  if (tScore == null) return { ar: 'لا توجد بيانات كافية بعد', en: 'No data yet', band: 'no-data' };

  if (tScore >= 60)
    return {
      ar: `تقدّم رائع! ${opts.beneficiaryName || 'ابنكم'} فاق التوقعات بشكل ملحوظ (T = ${tScore.toFixed(1)})`,
      en: `Excellent progress! Significantly exceeded expectations (T = ${tScore.toFixed(1)})`,
      band: 'excellent',
      suggestedAction: 'celebrate_continue',
    };

  // ... bands for 55-60, 45-55, 40-45, <40
}

function interpretForClinician(tScore, context) {
  /* ... */
}
function interpretForBeneficiary(tScore, opts) {
  /* age/ability adapted */
}

module.exports = Object.freeze({
  interpretForFamily,
  interpretForClinician,
  interpretForBeneficiary,
});
```

**API addition**:

```text
GET /api/beneficiaries/:id/gas-current?surface=family|clinician|beneficiary
    Returns T-score + interpretation appropriate to the surface
    MFA: tier 1
```

**Files**:

- New: `backend/intelligence/gas-interpretation.lib.js`
- Extension: `backend/services/gas.service.js`
- Extension: `backend/routes/gas.routes.js`

**Tests**:

- `backend/__tests__/gas-interpretation-wave453.test.js` (~18 assertions): every band, every surface, Arabic correctness

**Risk**: Low. Pure-lib addition.

---

### W454 — ICF Profile Aggregation Reports (Branch + National)

**Goal**: Branch-level and national-level aggregation reports of ICF outcomes for governance + regulatory submissions.

**Current state**: Per-beneficiary ICF assessments exist + per-beneficiary reports via `icfReport.service.js`. No branch/national aggregation.

**Addition**: New service methods + APIs for cross-beneficiary ICF aggregation.

**Aggregation logic**:
For a given branch + time window:

- Count of beneficiaries with ICF assessments
- Distribution of qualifier improvements per ICF code (across the population)
- Top 10 most-improved codes
- Top 10 codes showing decline
- Equity-disaggregated breakdowns (when Phase G builds): by gender, age band, severity, nationality

**Output format**:

- Branch-level: dashboard-friendly JSON + PDF export
- National-level: structured for Disability Authority submission (matches their template — to be confirmed with stakeholder)

**Files**:

- Extension: `backend/services/icfReport.service.js` — add `aggregateByBranch(branchId, range)`, `aggregateNational(range)`
- Extension: `backend/routes/icfReport.routes.js`
- New: `backend/services/icfDisabilityAuthorityReport.service.js` (if Disability Authority template differs significantly)

**APIs**:

```text
GET  /api/reports/icf-outcomes/branch/:branchId
     Branch-level ICF aggregate
     MFA: tier 2 (governance)

GET  /api/reports/icf-outcomes/national
     National-level ICF aggregate
     MFA: tier 3 (governance + restricted)

POST /api/reports/disability-authority/icf-monthly
     Generate monthly DA submission
     MFA: tier 3
```

**Tests**:

- `backend/__tests__/icf-aggregate-reports-wave454.test.js` (~14 assertions)

**Risk**: Medium. Aggregation queries may be slow on large datasets — needs index review + pagination strategy.

**Pre-flight**: Review existing indexes on `ICFAssessment`. Add `branchId + assessmentDate` compound index if missing.

---

### W455 — Crisis Pathway Orchestration

**Goal**: Unified orchestration over existing W356 SeizureEvent + W357 SafeguardingConcern + other crisis types. Implements the v3 lifecycle's **Dimension F (Crisis Readiness)** as a cross-cutting pathway.

**Current state**:

- [`models/SeizureEvent.js`](../../backend/models/SeizureEvent.js) — full ILAE 2017 classification, status epilepticus virtual ≥300s, rescue meds
- [`models/SafeguardingConcern.js`](../../backend/models/SafeguardingConcern.js) — intake-to-closure workflow, external reporting, CBAHI + PDPL compliance

**Missing orchestration**:

- Unified crisis intake (any crisis enters the same workflow first)
- EmergencyPlan per beneficiary (pre-built protocols)
- EscalationChain (who calls whom in what order)
- PostIncidentReview link to W193e RCA + FMEA
- Crisis dashboard for supervisors

**Approach**: thin orchestration layer over existing models. Don't merge models — just coordinate them.

**New entities**:

```javascript
// backend/models/EmergencyPlan.js
const EmergencyPlanSchema = new Schema(
  {
    beneficiaryId: { type: ObjectId, ref: 'Beneficiary', required: true, unique: true, index: true },
    branchId: { type: ObjectId, ref: 'Branch', required: true, index: true },

    knownConditions: [
      {
        type: { type: String, enum: ['seizure', 'allergy', 'cardiac', 'behavioral', 'medical-other'] },
        description: String,
        triggers: [String],
        rescueProtocol: String,
        rescueMedications: [String],
      },
    ],

    escalationChain: [
      {
        order: Number,
        role: String, // 'caregiver', 'physician', 'safeguarding-lead', 'emergency-services'
        contactMethod: { type: String, enum: ['phone', 'app-notification', 'whatsapp', 'email'] },
        contactDetails: String, // encrypted
        activationConditions: String, // e.g., "if seizure >5 min"
      },
    ],

    evacuationPlan: { type: String },
    hospitalPreference: { type: String },
    emergencyContacts: [
      {
        name: String,
        relationship: String,
        phone: String,
        isPrimary: { type: Boolean, default: false },
      },
    ],

    lastReviewedAt: { type: Date },
    reviewCadenceMonths: { type: Number, default: 6 },
    nextReviewDue: { type: Date },
  },
  {
    timestamps: true,
    collection: 'emergency_plans',
  },
);

// backend/models/CrisisIncident.js  (orchestrator entity, lighter than per-type models)
const CrisisIncidentSchema = new Schema(
  {
    beneficiaryId: { type: ObjectId, ref: 'Beneficiary', required: true, index: true },
    branchId: { type: ObjectId, ref: 'Branch', required: true, index: true },

    crisisType: {
      type: String,
      enum: ['medical-seizure', 'medical-other', 'behavioral', 'safeguarding', 'family', 'environmental', 'system'],
      required: true,
      index: true,
    },
    severity: { type: String, enum: ['critical', 'urgent', 'concerning', 'minor'], required: true },

    occurredAt: { type: Date, required: true, index: true },
    reportedAt: { type: Date, default: Date.now },
    reportedBy: { type: ObjectId, ref: 'User', required: true },

    // Link to specialized entity (if applicable)
    seizureEventId: { type: ObjectId, ref: 'SeizureEvent' },
    safeguardingConcernId: { type: ObjectId, ref: 'SafeguardingConcern' },

    // Response tracking
    emergencyPlanInvoked: { type: ObjectId, ref: 'EmergencyPlan' },
    escalationActions: [
      {
        actionType: String,
        performedBy: { type: ObjectId, ref: 'User' },
        performedAt: { type: Date, default: Date.now },
        outcome: String,
      },
    ],

    // Post-incident
    postIncidentReviewId: { type: ObjectId, ref: 'CapaItem' }, // CAPA from W337+
    rcaTriggered: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ['active', 'resolved', 'escalated', 'under-review', 'closed'],
      default: 'active',
      index: true,
    },
    closedAt: { type: Date },
  },
  {
    timestamps: true,
    collection: 'crisis_incidents',
  },
);

CrisisIncidentSchema.index({ branchId: 1, occurredAt: -1, severity: 1 });
```

**Service**: `backend/services/crisisOrchestrator.service.js`

- `reportCrisis({beneficiaryId, type, severity, details})` — creates `CrisisIncident` + invokes EmergencyPlan + starts escalation
- `linkSpecializedRecord(crisisId, type, recordId)` — links to SeizureEvent or SafeguardingConcern as appropriate
- `escalate(crisisId, action)` — manual escalation step
- `closeWithReview(crisisId, reviewerId)` — triggers PostIncidentReview if severity ≥ 'urgent'

**Bootstrap**: `backend/startup/crisisOrchestratorBootstrap.js` — wires the service + subscribes to safeguarding + seizure events from the bus (so an isolated SeizureEvent.create() auto-creates a CrisisIncident shadow).

**Files**:

- New: `backend/models/EmergencyPlan.js`
- New: `backend/models/CrisisIncident.js`
- New: `backend/services/crisisOrchestrator.service.js`
- New: `backend/routes/crisis.routes.js`
- New: `backend/startup/crisisOrchestratorBootstrap.js`
- Extension: `backend/app.js` — wire bootstrap

**APIs**:

```text
POST   /api/crisis                       Report crisis
GET    /api/crisis/:id                   Get incident
PATCH  /api/crisis/:id/escalate          Escalation step
POST   /api/crisis/:id/close-with-review Close + trigger review (tier 2 MFA)

POST   /api/emergency-plans/:beneficiaryId  Create/update plan (tier 2)
GET    /api/emergency-plans/:beneficiaryId  Get plan
```

**Tests**:

- `backend/__tests__/crisis-orchestrator-wave455.test.js` (~22 assertions)
  - Report crisis
  - Link to SeizureEvent
  - Link to SafeguardingConcern
  - Escalation chain execution
  - Auto-trigger PostIncidentReview for severity ≥ urgent
- `backend/__tests__/emergency-plan-wave455.test.js` (~12 assertions)

**Risk**: Medium. Orchestration over existing models — must not bypass their validations. Mitigation: orchestrator delegates to existing services, never writes directly to specialized collections.

---

### W456 — Phase A Smoke + Drift Guards + Sprint Tests

**Goal**: End-to-end Phase A verification + add waves to `test:sprint` enumeration.

**Activities**:

1. **End-to-end smoke test**:

   - Create a beneficiary
   - Add CarePlanGoal with ICF mapping (W449)
   - Create GAS scale via proposeScale (W451) → therapist edits → finalizes
   - Record GAS scoring
   - Trigger weekly snapshot cron (W452) → snapshot created
   - View family interpretation (W453) → Arabic narrative returned
   - Generate branch-level ICF report (W454) → aggregate produced
   - Report a crisis (W455) → linked to SeizureEvent → escalation → close → review

2. **Add all W448-W455 test files to `backend/sprint-tests.txt`** (per W278d single-source-of-truth pattern).

3. **Update CLAUDE.md drift-guard section** with W448-W455 entries:

   - `icf-core-sets-seeding-wave448.test.js`
   - `care-plan-goal-icf-mapping-wave449.test.js`
   - `icf-qualifier-mapping-wave450.test.js`
   - `gas-scale-builder-wave451.test.js`
   - `gas-snapshot-creation-wave452.test.js`
   - `gas-interpretation-wave453.test.js`
   - `icf-aggregate-reports-wave454.test.js`
   - `crisis-orchestrator-wave455.test.js`

4. **Update [`docs/MODULES.md`](../MODULES.md)** with new modules/services.

5. **Update [`docs/blueprint/beneficiary-lifecycle-v3.md`](../blueprint/beneficiary-lifecycle-v3.md)** Phase A section with actual wave numbers + completion status.

6. **Update [`031-beneficiary-lifecycle-v3-architecture.md`](decisions/031-beneficiary-lifecycle-v3-architecture.md)** ADR — Phase A status from 🟡 Proposed → ✅ Completed.

**Files**:

- Extension: `backend/sprint-tests.txt`
- Extension: `CLAUDE.md`
- Extension: `docs/MODULES.md`
- Extension: `docs/blueprint/beneficiary-lifecycle-v3.md`
- Extension: `docs/architecture/decisions/031-beneficiary-lifecycle-v3-architecture.md`
- New: `backend/__tests__/phase-a-e2e-smoke-wave456.test.js`

**Acceptance criteria**:

- ✅ E2E smoke green
- ✅ All 8 drift guards green in CI
- ✅ Sprint tests includes all W448-W455 files
- ✅ Documentation updates committed
- ✅ ADR-031 status flipped to ✅ for Phase A

**Risk**: Low. Integration verification only.

---

## 3. Dependencies & Critical Path

```text
W448 (Core Sets) ──┬──→ W449 (Goal ICF) ──→ W450 (Measure ICF) ──→ W454 (Reports)
                   │                                                       │
                   └──→ (independent)                                       │
                                                                            │
W451 (Scale builder) ──┐                                                    │
                       ├──→ W452 (Snapshots) ──→ W453 (Family interp) ─────┤
                       │                                                    │
                                                                            ▼
                                                              W456 (Smoke + Guards)
                                                                            ▲
W455 (Crisis orchestrator) ────────────────────────────────────────────────┘
       (parallel-runnable, doesn't depend on ICF/GAS waves)
```

**Critical path** (sequential): W448 → W449 → W450 → W454 → W456 (~10 days)

**Parallel-runnable**:

- W451 + W452 + W453 (GAS chain) can run alongside W448-W450
- W455 (Crisis) can run entirely independently from any wave

**Parallelization opportunity**: at 2 FTEs, total wall-clock time ~2 weeks instead of ~3.5 weeks.

---

## 4. Risk Register

| #   | Risk                                                | Probability                   | Impact | Mitigation                                          |
| --- | --------------------------------------------------- | ----------------------------- | ------ | --------------------------------------------------- |
| 1   | Existing ICF code coverage insufficient             | Medium                        | Medium | W448 pre-flight check; full seed if needed          |
| 2   | Arabic ICF translations inadequate                  | Medium                        | High   | Multi-source curation in W448; iterative refinement |
| 3   | Measure record save path breaks on hook addition    | Low                           | High   | W450 hook is fail-safe (log + skip on error)        |
| 4   | GAS snapshot cron load-impact on large branches     | Low                           | Medium | Snapshot in batches; staggered scheduling           |
| 5   | Crisis orchestrator double-creates incidents (race) | Medium                        | Medium | W455 uses CAS pattern from W424+ race-fix arc       |
| 6   | Parallel agent conflict on shared waves             | High (per session experience) | Low    | Atomic commit pattern (CLAUDE.md); branch isolation |
| 7   | EmergencyPlan PII handling                          | Medium                        | High   | Encryption at rest for contactDetails; PDPL audit   |

---

## 5. Success Criteria — Phase A Done When

- ✅ All 9 waves (W448-W456) committed + tests green
- ✅ At least 410 ICF codes in catalog with Arabic translations (≥80% coverage)
- ✅ 10 Core Sets available
- ✅ ≥80% of newly-created CarePlanGoals carry ICF mapping (verified 30 days after launch)
- ✅ GAS scale proposals operational (heuristic minimum)
- ✅ GAS snapshots collecting weekly (cron green for ≥7 days)
- ✅ Family interpretation API returns sensible Arabic for at least 5 sampled beneficiaries
- ✅ Branch-level ICF report runnable + PDF export verified
- ✅ Crisis orchestration creates CrisisIncident shadow when SeizureEvent or SafeguardingConcern created
- ✅ One end-to-end smoke test green
- ✅ All 8 W448-W455 drift guards in CI
- ✅ Sprint tests updated
- ✅ CLAUDE.md drift-guards section updated
- ✅ ADR-031 Phase A status: ✅ Completed

---

## 6. Post-Phase-A — What's Next

After W456, the next phase per ADR-031 Option 4 is **Phase B — Rights & Voice (Independent Advocate + Rights Module + Beneficiary Voice)**. Estimated W457-W470 (4 weeks, 14 waves).

Phase B doc to be written when Phase A nears completion. It is the highest-impact remaining Phase under Option 4 because:

1. CRPD compliance (legally binding since 2008)
2. CARF accreditation prerequisite
3. Ethical imperative
4. No existing infrastructure (per Gap Analysis §1.9)

---

## 7. Open Questions for Stakeholders Before W448 Kickoff

### Q1 — ICF code coverage baseline

What's the current `db.icfcodereferences.countDocuments()`? Need this number to scope W448 accurately.

### Q2 — Arabic translation review committee

Per the W448 spec, Arabic translations need clinical + family + linguistic review. Who are the reviewers?

### Q3 — Disability Authority report template

For W454's national report, what's the Disability Authority's required template? (May need their CIO contact + sample submission.)

### Q4 — Branch selection for cron pilots

For W452 GAS snapshot cron + W455 crisis orchestrator, which branch(es) start as pilot?

### Q5 — Crisis severity matrix sign-off

W455's severity tiers (critical/urgent/concerning/minor) — needs Clinical Director + Safeguarding Lead sign-off on the criteria per type.

---

## 8. Document History

- **2026-05-26**: Initial draft. Status: 🟡 Proposed. Awaiting ADR-031 approval + 5 stakeholder questions resolved.
- **Replaces**: the originally-planned `PHASE_A_WAVES_W391_W400.md` (renamed/rescoped after Gap Analysis).
- **Next**: Phase A kickoff (W448) after stakeholder approval.
