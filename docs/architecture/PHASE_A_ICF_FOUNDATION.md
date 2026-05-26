# Phase A — ICF Foundation Deep Dive

> ## ⚠️ IMPORTANT — Read Gap Analysis First
>
> This document was written BEFORE the codebase audit. The audit ([`GAP_ANALYSIS_LIFECYCLE_V3.md`](GAP_ANALYSIS_LIFECYCLE_V3.md)) revealed that:
>
> - **ICF already exists** at [`backend/models/icf/`](../../backend/models/icf/) (ICFCodeReference + ICFAssessment + ICFBenchmark) + [`backend/services/icfAssessment.service.js`](../../backend/services/icfAssessment.service.js)
> - **GAS T-score already exists** at [`backend/services/gas.service.js`](../../backend/services/gas.service.js) (W264, Kiresuk formula with ρ = 0.3)
>
> The schemas proposed in §4 (IcfCode, IcfProfile) duplicate existing models. The GAS T-score library proposed in §5 duplicates existing service. Effort estimate revised from 6 weeks → ~3 weeks (extensions only).
>
> **The corrected, audit-informed execution plan is [`PHASE_A_WAVES_W448_W456.md`](PHASE_A_WAVES_W448_W456.md)** — use that for actual implementation. This document is preserved as design thinking + conceptual reference for the ICF framework itself (which is still useful), but specific schemas, APIs, and wave numbers in this doc are SUPERSEDED.
>
> ---
>
> **Owner**: Architecture review session  
> **Date**: 2026-05-26  
> **Status**: 🟡 Design Proposal — **partial supersession by GAP_ANALYSIS_LIFECYCLE_V3.md + PHASE_A_WAVES_W448_W456.md** (see banner above)  
> **Scope**: Detailed design for adopting the WHO International Classification of Functioning, Disability and Health (ICF) as the universal language for all assessments, goals, and outcomes in the platform.  
> **Effort (revised)**: ~3 weeks of extensions (down from 6 weeks of fresh build) — see Phase A Waves W448-W456  
> **Dependencies**: existing ICF + GAS infrastructure (confirmed by audit) + Measures Library + CarePlan + Assessment models

---

## 1. Why ICF — The Strategic Argument

### 1.1 What ICF is

The **International Classification of Functioning, Disability and Health** (ICF) is the WHO's framework for measuring functioning at the individual and population level. Published 2001, with the children/youth variant (ICF-CY) in 2007. Both unified in 2012 ICF version.

It is:

- A **classification system** (codes for body functions, structures, activities, participation, environmental factors)
- A **conceptual model** (the biopsychosocial model of disability)
- A **measurement framework** (qualifiers 0-4 for each code)

### 1.2 What ICF is NOT

- Not a diagnosis system (ICD-11 is for diagnosis)
- Not a treatment protocol (just describes status, not what to do)
- Not a single number score (it's a profile across many codes)

### 1.3 Why we need it

| Problem in current system                                                                                           | How ICF solves it                                                              |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Outcomes incomparable across centers, regions, countries                                                            | ICF is the universal language; 60+ countries use it                            |
| Reports to MOH/Authority use local conventions                                                                      | ICF-coded reports are accepted internationally                                 |
| Cannot benchmark against international peers                                                                        | ICF outcomes are publishable and comparable                                    |
| Research grants/publications require standardized framework                                                         | ICF is the lingua franca of disability research                                |
| CARF accreditation expects ICF-based documentation                                                                  | CARF references ICF directly                                                   |
| AI models trained on local data don't generalize                                                                    | ICF-coded data joins the global pool                                           |
| Therapists from different disciplines speak different "languages" (PT uses Goniometry, SLP uses CELF, OT uses COPM) | ICF maps all of them to one framework                                          |
| Family doesn't understand the technical reports                                                                     | ICF includes lay-language equivalents (qualifier 0 = no problem, 4 = complete) |

### 1.4 Strategic value beyond compliance

- **National impact**: contribute ICF-coded data to Saudi disability registry → influence national policy
- **Research opportunity**: publishable in international journals
- **Saudi Vision 2030 alignment**: Quality of Life Program uses international metrics
- **CARF accreditation pathway**: ICF is foundational
- **Insurance value-based contracting**: insurers increasingly want ICF outcomes

---

## 2. The ICF Structure — Technical Detail

### 2.1 Two parts, four components

**Part 1: Functioning and Disability**

- **Body Functions** (prefix **b**)
- **Body Structures** (prefix **s**)
- **Activities and Participation** (prefix **d**)

**Part 2: Contextual Factors**

- **Environmental Factors** (prefix **e**)
- **Personal Factors** (no codes — described narratively)

### 2.2 Code structure

ICF codes are hierarchical alphanumerics:

```text
b  1  1  4  0
│  │  │  │  │
│  │  │  │  └── 4th level (most specific)
│  │  │  └───── 3rd level
│  │  └──────── 2nd level
│  └─────────── Chapter (1st level)
└────────────── Component (b/s/d/e)
```

**Example**: `b1140` = "Orientation to person" (b = body function, 1 = mental functions chapter, 1 = consciousness/energy/drive cluster, 4 = orientation, 0 = to person)

### 2.3 Qualifiers

Each code gets one or more qualifiers (0-4):

**Generic qualifier** (used for all components):

- **0** — NO problem (none, absent, negligible — 0-4%)
- **1** — MILD problem (slight, low — 5-24%)
- **2** — MODERATE problem (medium, fair — 25-49%)
- **3** — SEVERE problem (high, extreme — 50-95%)
- **4** — COMPLETE problem (total — 96-100%)
- **8** — not specified
- **9** — not applicable

**Activities and Participation (d) get TWO qualifiers**:

- First qualifier: **Performance** (what they actually do in current environment)
- Second qualifier: **Capacity** (what they could do in standardized environment)

So `d4500.2_3` means: walking short distances with moderate performance issue (.2) and severe capacity limitation (\_3).

**Environmental factors (e) qualifier** can be:

- Barrier: `e1101.2` (moderate barrier from drugs/medications)
- Facilitator: `e1101+2` (moderate facilitator from drugs)

### 2.4 Number of codes

- **Full ICF**: ~1,500 categories
- **ICF Core Sets**: ~100-200 codes per condition (developed for ~30+ conditions)
- **Brief ICF Core Sets**: ~10-20 codes (for quick screening)

**Saudi context**: There are no ICF Core Sets developed yet for specifically Saudi populations. We can adopt international core sets initially and contribute to Saudi-specific sets through our data.

### 2.5 ICF-CY adaptations (children/youth)

ICF-CY adds child-specific codes:

- Developmental milestones embedded
- Play categories
- School participation codes
- Family interaction codes specific to childhood

**For our context**: most beneficiaries are children/youth, so ICF-CY is the primary reference. Adults use ICF (mostly identical at the codes we'd use).

---

## 3. ICF Core Sets We Should Adopt

We don't implement all 1,500 codes. We implement **Core Sets per condition**, plus a Brief Core Set as fallback.

### 3.1 Recommended starter Core Sets (by prevalence in our caseload)

| Condition                                    | ICF Core Set Reference                         | Approximate Code Count           |
| -------------------------------------------- | ---------------------------------------------- | -------------------------------- |
| **Cerebral Palsy** (Brief + Comprehensive)   | WHO ICF Core Sets for CP (2013)                | 25 (Brief) / 135 (Comprehensive) |
| **Autism Spectrum Disorder**                 | ICF Core Sets for ASD (Bölte et al. 2014)      | 40 (Brief) / 111 (Comprehensive) |
| **Intellectual Disability**                  | ICF Core Sets for ID (Kraus de Camargo et al.) | 27 (Brief) / 122 (Comprehensive) |
| **Attention Deficit Hyperactivity Disorder** | ICF Core Sets for ADHD                         | 30 (Brief) / 95 (Comprehensive)  |
| **Down Syndrome**                            | Use ICF Core Sets for ID + condition-specific  | Custom                           |
| **Hearing Impairment**                       | ICF Core Sets for Hearing Loss                 | 27 (Brief) / 117 (Comprehensive) |
| **Visual Impairment**                        | ICF Core Sets for Vision                       | 21 (Brief) / 99 (Comprehensive)  |
| **Stroke / Acquired Brain Injury** (adults)  | ICF Core Sets for Stroke                       | 18 (Brief) / 130 (Comprehensive) |
| **Spinal Cord Injury**                       | ICF Core Sets for SCI (acute + chronic)        | 25 (Brief) / 168 (Comprehensive) |
| **Developmental Coordination Disorder**      | Brief set TBD                                  | ~30                              |

### 3.2 Brief ICF Core Set (generic fallback)

For any beneficiary not yet matched to a condition-specific Core Set, use the **Generic Brief Core Set** (~10 codes covering major domains):

```javascript
b117  Intellectual functions
b126  Temperament and personality
b134  Sleep
b167  Higher level cognitive functions
b280  Sensation of pain
d160  Focusing attention
d175  Solving problems
d350  Conversation
d530  Toileting
d550  Eating
```

Plus environmental:

```text
e310  Immediate family
e355  Health professionals
e410  Individual attitudes of immediate family members
e580  Health services, systems and policies
```

### 3.3 Total starter catalog

- ~10 Core Sets × ~30 codes each = ~300 codes
- - Generic Brief (10 codes)
- - Top 100 most-referenced individual codes
- = **~410 codes** in initial catalog

**Maintenance**: As we encounter new conditions, we add their Core Sets. The catalog grows naturally.

---

## 4. Database Schema Design

### 4.1 New collection: `IcfCode`

The canonical ICF codes catalog. Loaded from seed data, rarely changes (only on WHO ICF updates).

```javascript
// backend/models/IcfCode.js
const IcfCodeSchema = new Schema(
  {
    // Primary identifier
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
      match: /^[bsde][0-9]+$/, // e.g., 'b117', 'd4500', 'e310'
    },

    // Hierarchy
    component: {
      type: String,
      enum: ['b', 's', 'd', 'e'],
      required: true,
      index: true,
    },
    chapter: { type: Number, required: true, index: true },
    level: { type: Number, required: true, min: 1, max: 4 },
    parentCode: { type: String, index: true }, // for tree navigation

    // Description (Arabic + English)
    titleEn: { type: String, required: true },
    titleAr: { type: String, required: true },
    descriptionEn: { type: String },
    descriptionAr: { type: String },
    inclusionsEn: [String],
    inclusionsAr: [String],
    exclusionsEn: [String],
    exclusionsAr: [String],

    // Qualifier metadata
    hasTwoQualifiers: { type: Boolean, default: false }, // true for 'd' codes
    qualifierMeaning: {
      0: { en: 'No impairment', ar: 'لا ضعف' },
      1: { en: 'Mild', ar: 'خفيف' },
      2: { en: 'Moderate', ar: 'متوسط' },
      3: { en: 'Severe', ar: 'شديد' },
      4: { en: 'Complete', ar: 'كامل' },
    },

    // Categorization
    isInCoreSets: [{ type: String }], // ['CP_brief', 'ASD_brief', ...]
    conditionRelevance: [String], // ['cerebral_palsy', 'autism', ...]

    // ICF-CY indicator
    isCyOnly: { type: Boolean, default: false },

    // Metadata
    whoVersion: { type: String, default: '2017' },
    isActive: { type: Boolean, default: true },
    notes: { type: String },
  },
  {
    timestamps: true,
    collection: 'icf_codes',
  },
);

// Indexes for common queries
IcfCodeSchema.index({ component: 1, chapter: 1 });
IcfCodeSchema.index({ isInCoreSets: 1 });
IcfCodeSchema.index({ conditionRelevance: 1 });
IcfCodeSchema.index({ titleAr: 'text', titleEn: 'text' }); // full-text search
```

### 4.2 New collection: `IcfProfile`

Per-beneficiary ICF profile snapshots over time.

```javascript
// backend/models/IcfProfile.js
const IcfProfileSchema = new Schema(
  {
    beneficiaryId: { type: ObjectId, ref: 'Beneficiary', required: true, index: true },
    branchId: { type: ObjectId, ref: 'Branch', required: true, index: true },

    // Profile metadata
    assessmentId: { type: ObjectId, ref: 'Assessment' },
    episodeOfCareId: { type: ObjectId, ref: 'EpisodeOfCare' },
    type: {
      type: String,
      enum: ['baseline', 'periodic', 'pre-intervention', 'post-intervention', 'annual'],
      required: true,
      index: true,
    },

    // Core Set used
    coreSetUsed: { type: String }, // 'CP_brief', 'ASD_comprehensive', 'generic_brief', etc.

    // The profile entries
    entries: [
      {
        icfCode: { type: String, required: true, index: true }, // e.g., 'b117'
        component: { type: String, enum: ['b', 's', 'd', 'e'], required: true },

        // Primary qualifier
        qualifier: { type: Number, min: 0, max: 4 },
        qualifierNotSpecified: { type: Boolean, default: false }, // qualifier 8
        qualifierNotApplicable: { type: Boolean, default: false }, // qualifier 9

        // For 'd' codes only — second qualifier (Capacity)
        capacityQualifier: { type: Number, min: 0, max: 4 },

        // For 'e' codes — barrier or facilitator
        environmentalDirection: {
          type: String,
          enum: ['barrier', 'facilitator', 'neither'],
        },

        // Notes
        notes: { type: String },
        assessmentTool: { type: String }, // 'GMFCS', 'CELF-5', 'observation', etc.
        confidence: { type: String, enum: ['high', 'medium', 'low'] },
      },
    ],

    // Profile-level metadata
    assessedBy: { type: ObjectId, ref: 'User', required: true },
    reviewedBy: [{ type: ObjectId, ref: 'User' }],
    assessmentDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'reviewed', 'finalized', 'superseded'],
      default: 'draft',
    },

    // Lifecycle linkage
    supersedes: { type: ObjectId, ref: 'IcfProfile' },
    supersededBy: { type: ObjectId, ref: 'IcfProfile' },

    // Hash for tamper detection (use existing hash-chain.lib.js)
    contentHash: { type: String },
  },
  {
    timestamps: true,
    collection: 'icf_profiles',
  },
);

IcfProfileSchema.index({ beneficiaryId: 1, assessmentDate: -1 });
IcfProfileSchema.index({ beneficiaryId: 1, type: 1, status: 1 });
IcfProfileSchema.index({ branchId: 1, assessmentDate: -1 });
```

### 4.3 Extensions to existing models

**`CarePlanGoal`** — add ICF mapping and GAS scale:

```javascript
// Additions to existing CarePlanGoal schema
{
  // Existing fields preserved...

  // ICF mapping (NEW)
  icfCodes: [{
    code: { type: String, required: true },  // 'd4500'
    isPrimary: { type: Boolean, default: false },  // one primary, others contributory
    targetQualifier: { type: Number, min: 0, max: 4 },  // qualifier we aim for
    baselineQualifier: { type: Number, min: 0, max: 4 }  // qualifier at goal-setting
  }],

  // GAS Scale (NEW)
  gasScale: {
    minus2: { type: String, required: true },  // "much less than expected"
    minus1: { type: String, required: true },  // "less than expected"
    zero:   { type: String, required: true },  // "expected level (the goal)"
    plus1:  { type: String, required: true },  // "better than expected"
    plus2:  { type: String, required: true }   // "much better than expected"
  },
  gasWeight: { type: Number, min: 1, max: 3, default: 1 },
  gasConstructedAt: { type: Date },
  gasConstructedBy: { type: ObjectId, ref: 'User' }
}
```

**`MeasureRecord`** — add ICF qualifier mapping:

```javascript
// Additions to existing MeasureRecord schema
{
  // Existing fields preserved...

  icfMapping: {
    code: { type: String },  // primary ICF code this measure speaks to
    qualifierBefore: { type: Number, min: 0, max: 4 },
    qualifierAfter: { type: Number, min: 0, max: 4 },
    confidence: { type: String, enum: ['high', 'medium', 'low'] }
  },

  // GAS score for the related goal at this measurement point (-2 to +2)
  gasScore: { type: Number, min: -2, max: 2 }
}
```

**`MeasurementMaster`** (the measure library) — add ICF mapping:

```javascript
// Additions to existing MeasurementMaster schema
{
  // Existing fields preserved...

  defaultIcfMapping: {
    primary: { type: String },  // e.g., 'b730' for muscle power for a strength measure
    secondary: [String],
    qualifierAlgorithm: {
      type: String,
      enum: [
        'direct_5_band',     // value bands map directly to 0-4
        'inverse_5_band',    // higher value = lower impairment
        'threshold_based',   // single threshold
        'manual'             // clinician decides
      ]
    },
    qualifierBands: [{
      minValue: Number,
      maxValue: Number,
      qualifier: Number  // 0-4
    }]
  }
}
```

### 4.4 New collection: `GasScoreSnapshot`

For tracking GAS T-score progression efficiently.

```javascript
// backend/models/GasScoreSnapshot.js
const GasScoreSnapshotSchema = new Schema(
  {
    beneficiaryId: { type: ObjectId, ref: 'Beneficiary', required: true, index: true },
    branchId: { type: ObjectId, ref: 'Branch', required: true, index: true },
    episodeOfCareId: { type: ObjectId, ref: 'EpisodeOfCare', index: true },

    // Snapshot metadata
    snapshotDate: { type: Date, required: true, index: true },
    snapshotType: {
      type: String,
      enum: ['session', 'weekly', 'monthly', 'quarterly', 'annual', 'ad-hoc'],
      required: true,
    },

    // The T-score
    tScore: { type: Number, required: true }, // 50 = expected, SD=10
    tScoreCI95Lower: { type: Number }, // 95% confidence interval lower
    tScoreCI95Upper: { type: Number },

    // Component goals
    goals: [
      {
        goalId: { type: ObjectId, ref: 'CarePlanGoal', required: true },
        gasScore: { type: Number, min: -2, max: 2, required: true },
        weight: { type: Number, min: 1, max: 3, required: true },
        icfCode: { type: String },
      },
    ],

    // Calculation metadata
    goalCount: { type: Number, required: true },
    totalWeight: { type: Number, required: true },
    calculationVersion: { type: String, default: 'v1' },
    calculatedAt: { type: Date, default: Date.now },
    calculatedBy: {
      type: String,
      enum: ['automatic', 'manual'],
      default: 'automatic',
    },
  },
  {
    timestamps: true,
    collection: 'gas_score_snapshots',
  },
);

GasScoreSnapshotSchema.index({ beneficiaryId: 1, snapshotDate: -1 });
GasScoreSnapshotSchema.index({ branchId: 1, snapshotDate: -1, snapshotType: 1 });
GasScoreSnapshotSchema.index({ episodeOfCareId: 1, snapshotDate: -1 });
```

---

## 5. The GAS T-Score Library

### 5.1 Pure-lib pattern (per ADR-011 + W325 P2 + W332 + W334)

```javascript
// backend/intelligence/gas-tscore.lib.js
// Pure functions, no Mongoose dependency, fully unit-testable

'use strict';

const GAS_VALID_SCORES = [-2, -1, 0, 1, 2];
const WEIGHT_MIN = 1;
const WEIGHT_MAX = 3;
const T_SCORE_MEAN = 50;
const T_SCORE_SD = 10;
const KIRESUK_RHO = 0.7; // standard inter-goal correlation assumption

/**
 * Calculate GAS T-score for a set of weighted goal outcomes.
 *
 * @param {Array<{gasScore: number, weight: number}>} goalOutcomes
 * @param {Object} [options]
 * @param {number} [options.rho=0.7] - assumed correlation between goals
 * @returns {{ tScore: number, ci95Lower: number, ci95Upper: number, goalCount: number, totalWeight: number, valid: boolean, reason?: string }}
 */
function calculateGasTScore(goalOutcomes, options = {}) {
  const rho = options.rho ?? KIRESUK_RHO;

  // Validation
  if (!Array.isArray(goalOutcomes) || goalOutcomes.length === 0) {
    return { tScore: null, valid: false, reason: 'NO_GOALS' };
  }

  for (const g of goalOutcomes) {
    if (!GAS_VALID_SCORES.includes(g.gasScore)) {
      return { tScore: null, valid: false, reason: 'INVALID_GAS_SCORE' };
    }
    if (typeof g.weight !== 'number' || g.weight < WEIGHT_MIN || g.weight > WEIGHT_MAX) {
      return { tScore: null, valid: false, reason: 'INVALID_WEIGHT' };
    }
  }

  // Kiresuk-Sherman formula:
  // T = 50 + 10 × Σ(w_i × x_i) / √(rho × Σ(w_i²) + (1-rho) × (Σw_i)²)

  const numerator = goalOutcomes.reduce((sum, g) => sum + g.weight * g.gasScore, 0);
  const sumWeightSquared = goalOutcomes.reduce((sum, g) => sum + g.weight ** 2, 0);
  const sumWeight = goalOutcomes.reduce((sum, g) => sum + g.weight, 0);

  const denominator = Math.sqrt(rho * sumWeightSquared + (1 - rho) * sumWeight ** 2);

  if (denominator === 0) {
    return { tScore: null, valid: false, reason: 'ZERO_DENOMINATOR' };
  }

  const tScore = T_SCORE_MEAN + T_SCORE_SD * (numerator / denominator);

  // Confidence interval (simplified — full bootstrap available as advanced option)
  const sem = T_SCORE_SD / Math.sqrt(goalOutcomes.length);
  const ci95Lower = tScore - 1.96 * sem;
  const ci95Upper = tScore + 1.96 * sem;

  return {
    tScore: Number(tScore.toFixed(2)),
    ci95Lower: Number(ci95Lower.toFixed(2)),
    ci95Upper: Number(ci95Upper.toFixed(2)),
    goalCount: goalOutcomes.length,
    totalWeight: sumWeight,
    valid: true,
  };
}

/**
 * Validate a GAS scale (the -2 to +2 anchors for a single goal).
 *
 * @param {Object} scale
 * @param {string} scale.minus2
 * @param {string} scale.minus1
 * @param {string} scale.zero
 * @param {string} scale.plus1
 * @param {string} scale.plus2
 * @returns {{ valid: boolean, errors: Array<string> }}
 */
function validateGasScale(scale) {
  const errors = [];
  if (!scale || typeof scale !== 'object') {
    return { valid: false, errors: ['NOT_OBJECT'] };
  }

  const requiredKeys = ['minus2', 'minus1', 'zero', 'plus1', 'plus2'];
  for (const key of requiredKeys) {
    if (!scale[key] || typeof scale[key] !== 'string' || scale[key].trim().length < 10) {
      errors.push(`MISSING_OR_TOO_SHORT:${key}`);
    }
  }

  // Check anchors are distinct
  const anchors = requiredKeys.map(k => scale[k]?.trim()?.toLowerCase()).filter(Boolean);
  if (new Set(anchors).size !== anchors.length) {
    errors.push('DUPLICATE_ANCHORS');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Interpret T-score in plain Arabic and English.
 */
function interpretTScore(tScore) {
  if (tScore == null) {
    return { en: 'No data', ar: 'لا توجد بيانات' };
  }
  if (tScore >= 60) {
    return { en: 'Significantly exceeded expectations', ar: 'فاق التوقعات بشكل ملحوظ', band: 'excellent' };
  }
  if (tScore >= 55) {
    return { en: 'Exceeded expectations', ar: 'فاق التوقعات', band: 'good' };
  }
  if (tScore >= 45) {
    return { en: 'Met expectations', ar: 'حقق التوقعات', band: 'as-expected' };
  }
  if (tScore >= 40) {
    return { en: 'Below expectations', ar: 'أقل من التوقعات', band: 'below' };
  }
  return { en: 'Significantly below expectations', ar: 'أقل من التوقعات بشكل ملحوظ', band: 'poor' };
}

/**
 * Calculate progression delta between two T-score snapshots.
 */
function calculateProgression(beforeTScore, afterTScore) {
  if (beforeTScore == null || afterTScore == null) {
    return { delta: null, direction: 'unknown' };
  }
  const delta = afterTScore - beforeTScore;
  const meaningfulThreshold = 5; // half a SD

  let direction;
  if (delta >= meaningfulThreshold) direction = 'significant_improvement';
  else if (delta > 0) direction = 'mild_improvement';
  else if (delta === 0) direction = 'stable';
  else if (delta > -meaningfulThreshold) direction = 'mild_decline';
  else direction = 'significant_decline';

  return {
    delta: Number(delta.toFixed(2)),
    direction,
    deltaPercentage: Number(((delta / beforeTScore) * 100).toFixed(1)),
  };
}

module.exports = Object.freeze({
  calculateGasTScore,
  validateGasScale,
  interpretTScore,
  calculateProgression,

  // Constants exposed for tests
  GAS_VALID_SCORES,
  WEIGHT_MIN,
  WEIGHT_MAX,
  T_SCORE_MEAN,
  T_SCORE_SD,
  KIRESUK_RHO,
});
```

### 5.2 The ICF Mapping Library

```javascript
// backend/intelligence/icf-mapping.lib.js
// Pure functions for mapping measure values to ICF qualifiers

'use strict';

/**
 * Map a numeric measure value to an ICF qualifier (0-4).
 *
 * @param {number} value - the measured value
 * @param {Object} mapping - the qualifier algorithm config
 * @param {string} mapping.algorithm - 'direct_5_band' | 'inverse_5_band' | 'threshold_based' | 'manual'
 * @param {Array<{minValue, maxValue, qualifier}>} mapping.bands
 * @returns {{ qualifier: number, confidence: string } | null}
 */
function mapValueToQualifier(value, mapping) {
  if (mapping.algorithm === 'manual') return null;

  if (typeof value !== 'number' || isNaN(value)) {
    return null;
  }

  if (!Array.isArray(mapping.bands) || mapping.bands.length === 0) {
    return null;
  }

  // Find the band containing this value
  for (const band of mapping.bands) {
    if (value >= band.minValue && value <= band.maxValue) {
      return {
        qualifier: band.qualifier,
        confidence: 'high', // confidence is high when value falls clearly within a band
      };
    }
  }

  // Value outside all defined bands
  return null;
}

/**
 * Build an ICF profile summary from individual code qualifiers.
 * Aggregates by component (b/s/d/e) and reports impairment burden.
 *
 * @param {Array<{icfCode, qualifier, capacityQualifier?, component}>} entries
 * @returns {{ summary: Object, totalCodes: number, impairmentBurden: number }}
 */
function summarizeIcfProfile(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return { summary: {}, totalCodes: 0, impairmentBurden: 0 };
  }

  const byComponent = { b: [], s: [], d: [], e: [] };
  let totalImpairment = 0;
  let codedCount = 0;

  for (const entry of entries) {
    if (!entry.component || !byComponent[entry.component]) continue;
    byComponent[entry.component].push(entry);

    if (typeof entry.qualifier === 'number' && entry.qualifier >= 0 && entry.qualifier <= 4) {
      totalImpairment += entry.qualifier;
      codedCount++;
    }
  }

  // Impairment burden = average qualifier × 25 (scaled to 0-100)
  const impairmentBurden = codedCount > 0 ? Number(((totalImpairment / codedCount) * 25).toFixed(1)) : 0;

  return {
    summary: {
      bodyFunctions: { count: byComponent.b.length, averageQualifier: avgQualifier(byComponent.b) },
      bodyStructures: { count: byComponent.s.length, averageQualifier: avgQualifier(byComponent.s) },
      activitiesParticipation: { count: byComponent.d.length, averageQualifier: avgQualifier(byComponent.d) },
      environmental: {
        count: byComponent.e.length,
        barriers: byComponent.e.filter(e => e.environmentalDirection === 'barrier').length,
        facilitators: byComponent.e.filter(e => e.environmentalDirection === 'facilitator').length,
      },
    },
    totalCodes: entries.length,
    impairmentBurden,
  };
}

function avgQualifier(entries) {
  const validQualifiers = entries.map(e => e.qualifier).filter(q => typeof q === 'number' && q >= 0 && q <= 4);
  if (validQualifiers.length === 0) return null;
  return Number((validQualifiers.reduce((s, q) => s + q, 0) / validQualifiers.length).toFixed(2));
}

/**
 * Compare two ICF profiles and detect changes.
 */
function compareIcfProfiles(profileBefore, profileAfter) {
  const beforeMap = new Map(profileBefore.entries.map(e => [e.icfCode, e]));
  const afterMap = new Map(profileAfter.entries.map(e => [e.icfCode, e]));

  const changes = [];

  for (const [code, after] of afterMap) {
    const before = beforeMap.get(code);
    if (!before) {
      changes.push({ icfCode: code, change: 'added', after: after.qualifier });
    } else if (before.qualifier !== after.qualifier) {
      changes.push({
        icfCode: code,
        change: after.qualifier < before.qualifier ? 'improved' : 'declined',
        before: before.qualifier,
        after: after.qualifier,
        delta: after.qualifier - before.qualifier,
      });
    }
  }

  for (const [code, before] of beforeMap) {
    if (!afterMap.has(code)) {
      changes.push({ icfCode: code, change: 'removed', before: before.qualifier });
    }
  }

  return {
    changes,
    improvedCount: changes.filter(c => c.change === 'improved').length,
    declinedCount: changes.filter(c => c.change === 'declined').length,
    addedCount: changes.filter(c => c.change === 'added').length,
    removedCount: changes.filter(c => c.change === 'removed').length,
  };
}

module.exports = Object.freeze({
  mapValueToQualifier,
  summarizeIcfProfile,
  compareIcfProfiles,
});
```

---

## 6. API Design

### 6.1 ICF code lookup APIs

```javascript
GET  /api/icf/codes?component=d&chapter=4&search=walk
     Lists ICF codes matching filters
     Query params: component, chapter, search (text), coreSet, limit, offset
     Returns: { codes: [...], total, page, pageSize }

GET  /api/icf/codes/:code
     Returns full detail for a single code
     Returns: IcfCode document + parent + children codes

GET  /api/icf/core-sets
     Lists available Core Sets
     Returns: [{ name, condition, codeCount, brief: boolean }]

GET  /api/icf/core-sets/:setName
     Returns all codes in a specific Core Set
     Returns: { setName, codes: [...] }
```

### 6.2 ICF profile APIs

```text
GET  /api/beneficiaries/:id/icf-profile
     Returns latest ICF profile
     MFA: tier 1 (read)
     Branch-scope: required
     Returns: latest IcfProfile

GET  /api/beneficiaries/:id/icf-profile/history
     Returns all ICF profiles for beneficiary
     Returns: [IcfProfile, ...]

POST /api/beneficiaries/:id/icf-profile
     Creates new ICF profile
     MFA: tier 2 (clinical assertion)
     Body: { coreSetUsed, type, entries: [...], assessedBy }
     Returns: created IcfProfile

POST /api/beneficiaries/:id/icf-profile/:profileId/finalize
     Finalizes a draft profile (status: draft → finalized)
     MFA: tier 2
     Returns: updated IcfProfile

POST /api/beneficiaries/:id/icf-profile/compare
     Compares two profiles (e.g., before/after intervention)
     Body: { beforeProfileId, afterProfileId }
     Returns: { changes, improvedCount, declinedCount, ... }
```

### 6.3 GAS scale APIs

```javascript
POST /api/care-plan-goals/:id/gas-scale
     Construct GAS scale for a goal
     MFA: tier 2
     Body: { minus2, minus1, zero, plus1, plus2, weight }
     Returns: updated CarePlanGoal

POST /api/care-plan-goals/:id/gas-score
     Record a GAS score observation
     Body: { gasScore, observedAt, observedBy, notes }
     Returns: { goalId, gasScore, observedAt, snapshotTriggered }

GET  /api/beneficiaries/:id/gas-progression
     Returns T-score progression over time
     Query params: from, to, granularity (weekly|monthly|quarterly)
     Returns: [GasScoreSnapshot, ...]

GET  /api/beneficiaries/:id/gas-current
     Returns current T-score across active goals
     Returns: { tScore, ci95Lower, ci95Upper, interpretation, goals: [...] }
```

### 6.4 Reporting APIs

```javascript
GET  /api/reports/icf-outcomes/branch/:branchId
     Aggregate ICF outcomes for a branch
     Query: from, to, condition (optional filter)
     MFA: tier 2 (governance)
     Returns: { branchId, period, beneficiaryCount, icfImprovementByDomain, equityBreakdown }

GET  /api/reports/icf-outcomes/national
     Aggregate national-level ICF outcomes (for Disability Authority reports)
     MFA: tier 3 (governance)
     Returns: ICF-coded national summary

POST /api/reports/disability-authority/icf-monthly
     Generate monthly ICF report for Disability Authority
     MFA: tier 3
     Returns: { reportId, status, generatedFile }
```

---

## 7. Integration with Existing Code

### 7.1 Touch points by module

| Existing module                                        | Integration                                    |
| ------------------------------------------------------ | ---------------------------------------------- |
| `backend/models/CarePlanGoal.js`                       | Add `icfCodes`, `gasScale`, `gasWeight` fields |
| `backend/models/MeasureRecord.js`                      | Add `icfMapping`, `gasScore` fields            |
| `backend/intelligence/measure-lifecycle.lib.js`        | Read ICF mapping when computing outcomes       |
| `backend/intelligence/measure-library.json` (W325)     | Each measure carries default ICF mapping       |
| `backend/services/assessmentRecommendation.service.js` | Suggested goals come with ICF code suggestions |
| `backend/services/aiRecommendation.service.js` (W334)  | AI recommendations reference ICF codes         |
| `backend/intelligence/care-planning.registry.js` (W41) | Plan types associate with typical ICF domains  |
| `backend/scheduler/measure-alert.scheduler.js`         | Plateau detection uses ICF profile diff        |
| `backend/routes/measures.routes.js`                    | Returns ICF-mapped data                        |

### 7.2 Migration path for existing data

**Existing CarePlanGoals without ICF codes**:

- Backward-compatible (icfCodes is optional array)
- Migration script suggests ICF codes for existing goals (heuristic + human review)
- Therapists progressively add ICF codes during normal care
- Reports gracefully handle goals without ICF codes (excluded from ICF-aggregated reports)

**Existing MeasureRecords without ICF qualifiers**:

- Backward-compatible
- Forward-only adoption (new records get ICF, old don't get retroactively coded)
- Optional retroactive coding via batch script

**Existing GAS scales**: There are none. All new goals get GAS scales constructed during Phase 3 (Co-Design) of v3 lifecycle.

### 7.3 New roles & permissions needed

```javascript
// Add to backend/authorization/canonical-roles.js
{
  // New permission group
  'icf:': {
    'icf:read': 'Read ICF profiles',
    'icf:write': 'Create/update ICF profiles',
    'icf:finalize': 'Finalize ICF profiles (tier 2 MFA required)',
    'icf:lookup': 'Use ICF code lookup (most clinicians)'
  },
  'gas:': {
    'gas:scale:write': 'Construct GAS scales (clinician role)',
    'gas:score:write': 'Record GAS scores during sessions',
    'gas:tscore:read': 'View T-score progression'
  },
  'icf-reports:': {
    'icf-reports:branch': 'Branch-level ICF reports',
    'icf-reports:national': 'National-level ICF reports (governance tier)'
  }
}
```

---

## 8. Seeding Strategy

### 8.1 ICF code catalog seed

```javascript
// backend/scripts/seed-icf-codes.js
// Seeds the ~410 codes (Brief Core Sets + Generic Brief + top individual codes)

// Source data: WHO ICF Browser (https://icd.who.int/browse/2024-01/icf/en)
// Strategy:
//   1. Curated JSON file with English titles + descriptions
//   2. Arabic translations: existing community translations (Disabled Peoples' Federation, MOH translations)
//   3. Per-code: which Core Sets it belongs to

// Usage:
//   npm run seed:icf-codes               -- full seed
//   npm run seed:icf-codes -- --update   -- update existing (for WHO version updates)
//   npm run seed:icf-codes -- --core-sets-only  -- just Core Set memberships
```

### 8.2 ICF mapping for existing MeasurementMaster

```javascript
// backend/scripts/seed-measure-icf-mappings.js
// Maps existing measures to their default ICF codes

// Example mappings (heuristic + clinician-reviewed):
//   GMFCS-E&R → b770 (gait pattern functions), d4500 (walking short distances)
//   CELF-5 → b167 (mental functions of language), d330 (speaking)
//   COPM → d550 (eating), d540 (dressing), d510 (washing oneself) — varies per goal
//   ROM measurements → b710 (joint mobility) + specific structures
//   ...

// Usage:
//   npm run seed:measure-icf-mappings              -- propose mappings
//   npm run seed:measure-icf-mappings -- --apply   -- apply approved mappings
```

### 8.3 Arabic translations for Core Sets

**Sources**:

1. WHO official ICF Arabic translation (limited coverage)
2. Saudi MOH translations (medical contexts)
3. Disabled Peoples' Federation translations (advocacy contexts)
4. Internal terminology committee review

**Quality control**: Each translation reviewed by:

- 1 clinical reviewer (relevant discipline)
- 1 family/advocacy reviewer
- 1 linguistic reviewer

---

## 9. Testing Strategy

### 9.1 Unit tests (pure-lib)

```javascript
backend/__tests__/icf-foundation/
  ├── gas-tscore.lib.test.js              (~30 tests)
  │   - T-score calculation with various weight combos
  │   - Edge cases: 1 goal, max goals, max weights
  │   - CI calculation correctness
  │   - Validation failure paths
  │
  ├── icf-mapping.lib.test.js              (~25 tests)
  │   - Direct band mapping
  │   - Inverse band mapping
  │   - Threshold mapping
  │   - Profile summarization
  │   - Profile comparison (added/removed/improved/declined)
  │
  ├── icf-validation.test.js               (~15 tests)
  │   - Code format validation
  │   - Qualifier range validation
  │   - Component-specific qualifier rules (d gets 2, others get 1)
  │   - Core Set membership lookups
```

### 9.2 Integration tests

```text
backend/__tests__/icf-foundation/
  ├── icf-profile-lifecycle.integration.test.js     (~20 tests)
  │   - Profile creation through workflow
  │   - Profile finalization gates
  │   - Supersession chain integrity
  │   - Hash-chain validation
  │
  ├── care-plan-goal-icf-mapping.integration.test.js  (~15 tests)
  │   - Adding ICF codes to existing goals
  │   - Validation: codes must exist in catalog
  │   - Primary code constraint (exactly one primary)
  │
  ├── measure-record-icf-mapping.integration.test.js  (~12 tests)
  │   - Automatic qualifier calculation from value
  │   - Manual override
  │   - GAS score linkage
  │
  ├── gas-snapshot-aggregation.integration.test.js    (~18 tests)
  │   - Snapshot triggered on session
  │   - Weekly/monthly/quarterly aggregation
  │   - Branch-level rollup
```

### 9.3 API tests

```text
backend/__tests__/icf-foundation/
  ├── icf-code-routes.api.test.js          (~20 tests, all endpoints)
  ├── icf-profile-routes.api.test.js       (~25 tests, all endpoints)
  ├── gas-scale-routes.api.test.js         (~18 tests)
  └── icf-reports-routes.api.test.js       (~15 tests)
```

### 9.4 Drift guards (per CLAUDE.md pattern)

```text
backend/__tests__/
  ├── icf-catalog-integrity-wave391.test.js
  │   - Every code in IcfCode collection has valid format
  │   - No orphan codes (parent codes exist)
  │   - Core Set memberships reference valid sets
  │   - Arabic + English translations present for active codes
  │
  ├── icf-mapping-completeness-wave395.test.js
  │   - Every MeasurementMaster has icf mapping or explicit exemption
  │   - Drift: new MeasurementMaster without mapping fails CI
  │
  ├── gas-scale-coverage-wave397.test.js
  │   - Every active CarePlanGoal has GAS scale OR exemption
  │   - Drift: new goal without GAS scale fails CI after grace period
```

**Test count target**: ~213 new tests across the suite, joining `test:sprint`.

---

## 10. Wave-by-Wave Plan Reference

See [`docs/architecture/PHASE_A_WAVES_W391_W400.md`](PHASE_A_WAVES_W391_W400.md) for the wave-level execution plan.

Summary:

- **W391**: IcfCode model + seed script + 410 codes loaded
- **W392**: IcfProfile model + basic CRUD APIs
- **W393**: ICF Code lookup APIs + Core Set APIs
- **W394**: CarePlanGoal ICF mapping extensions
- **W395**: MeasurementMaster ICF mapping + drift guard
- **W396**: GAS scale schema + validation lib + APIs
- **W397**: GAS T-score lib + snapshot computation + drift guard
- **W398**: MeasureRecord ICF qualifier mapping + integration
- **W399**: ICF reporting APIs (branch + national)
- **W400**: End-to-end smoke + frontend integration + therapist training materials

---

## 11. Risks & Mitigations

| #   | Risk                                                | Probability | Impact | Mitigation                                                                       |
| --- | --------------------------------------------------- | ----------- | ------ | -------------------------------------------------------------------------------- |
| 1   | Arabic ICF translations inadequate for clinical use | Medium      | High   | Multi-source curation; terminology committee; iterative refinement               |
| 2   | Therapists view ICF as bureaucratic burden          | High        | Medium | Embedded in existing workflows (not separate forms); AI-assisted code suggestion |
| 3   | Mapping algorithms produce inaccurate qualifiers    | Medium      | High   | Algorithm choice per measure (manual for ambiguous); clinician override always   |
| 4   | GAS scale construction time-consuming               | Medium      | Medium | AI-assisted scale draft from goal text; reusable templates per condition         |
| 5   | Reports break when goals lack ICF codes             | Medium      | Low    | Graceful degradation; flag uncoded goals separately                              |
| 6   | WHO updates ICF causing version drift               | Low         | Medium | Version field; migration script for version updates                              |
| 7   | Core Set inadequate for specific beneficiary        | Low         | Medium | Always allow additional codes beyond Core Set; "extension" pattern               |

---

## 12. Success Criteria — Phase A Done When

- ✅ All 410 ICF codes loaded with Arabic + English translations
- ✅ 10 Core Sets available for selection
- ✅ ICF profile creation workflow in production
- ✅ At least 80% of new CarePlanGoals carry ICF codes within 30 days of launch
- ✅ GAS scales constructed for 100% of new goals
- ✅ T-score snapshots generated automatically per session
- ✅ Branch-level ICF outcome reports operational
- ✅ Drift guards green: catalog integrity + mapping completeness + GAS coverage
- ✅ ~213 tests passing in `test:sprint`
- ✅ Therapist training completed (workshop + reference materials)
- ✅ One pilot Disability Authority monthly report generated end-to-end

**Phase B unblocked when these are met.**

---

## 13. References

- World Health Organization. (2001). _International Classification of Functioning, Disability and Health (ICF)_. Geneva.
- World Health Organization. (2007). _International Classification of Functioning, Disability and Health: Children and Youth Version (ICF-CY)_. Geneva.
- WHO ICF Browser: https://icd.who.int/browse/2024-01/icf/en (URL provided by WHO publicly)
- Kiresuk, T., & Sherman, R. (1968). Goal Attainment Scaling. _Community Mental Health Journal_ 4(6), 443-453.
- Steenbeek, D., et al. (2010). Goal Attainment Scaling in paediatric rehabilitation. _Developmental Medicine & Child Neurology_.
- Bölte, S., et al. (2014). The Gestalt of functioning in autism spectrum disorder: results of the international conference to develop final consensus ICF Core Sets. _Autism_ 18(7), 754-769.
- Schiariti, V., et al. (2014). International Classification of Functioning, Disability and Health Core Sets for children and youth with cerebral palsy. _Dev Med Child Neurol_.

---

## 14. Document History

- **2026-05-26**: Initial draft. Status: 🟡 Design Proposal (pending ADR-031 approval).
- **Next**: Stakeholder review + decision on Option 4 (from ADR-031) + Wave W391 kickoff if approved.
