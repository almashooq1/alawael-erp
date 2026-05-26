# Causal Inference Engine — Deep Dive

> **Owner**: Architecture review session  
> **Date**: 2026-05-26  
> **Status**: 🟡 Design Proposal — **DEFERRED under Option 4 (v3 Lite)**, kept as North Star.  
> **Phase**: D (W421-W435 in full v3 roadmap)  
> **Effort**: 8 weeks  
> **Dependencies**: Phase A (ICF Foundation) + 6+ months of operational data + ADR-011 compliance  
> **Why deferred**: requires data accumulation; Phase A must complete first; engineering bandwidth in initial 28-week Option 4 window is reserved for Phases A-C + E-G.

---

## 1. The Strategic Argument — Why Causal, Not Just Predictive

### 1.1 What we have today (Levels 1-4 of the Intelligence Stack)

| Level           | Question           | Status     | Example output                        |
| --------------- | ------------------ | ---------- | ------------------------------------- |
| 1. Descriptive  | What happened?     | ✅         | "73% session completion rate"         |
| 2. Diagnostic   | Why did it happen? | ⚠️ Partial | "Dropout high because wait time long" |
| 3. Predictive   | What will happen?  | ✅ W339    | "78% plateau probability in 30 days"  |
| 4. Prescriptive | What should we do? | ✅ W334    | "Try intervention X"                  |

### 1.2 What's missing — Level 5: Causal

**Question**: "Did our intervention CAUSE the change, or would it have happened anyway?"

This is the **single most consequential gap** in the analytical capability of any rehab platform.

### 1.3 The four real-world problems caused by absence of causal layer

**Problem 1: Attribution fallacy**

A child receives intensive PT for 6 months. Their GMFCS improves. Therapist concludes: "PT works."

**Reality check**: 4-year-olds with cerebral palsy show natural functional improvement in 60% of cases regardless of intervention, driven by neurological maturation. Without a counterfactual ("what would have happened without intensive PT?"), the therapist cannot distinguish:

- (a) PT caused all the improvement
- (b) PT caused some of the improvement
- (c) Natural maturation caused all the improvement, PT was neutral
- (d) PT actually slowed progress vs. an alternative

**Cost of fallacy**: We pay for and continue interventions that may add nothing. Or worse, we double-down on interventions that are actively suboptimal.

**Problem 2: Insurer/payer rejection**

Saudi insurers (under Vision 2030 healthcare reform) are moving toward value-based contracting. An insurer asks: "Prove that your rehab program produces better outcomes than no program."

Predictive evidence ("our beneficiaries improve") is insufficient. Insurers ask:

- Compared to what?
- Adjusted for severity?
- Controlled for natural history?
- Replicated across cohorts?

**Without causal evidence**, we cannot bill value-based. We remain in fee-for-service forever, even as the market moves on.

**Problem 3: Research credibility**

Top international journals (NEJM, JAMA, Lancet) reject submissions lacking causal design. To position the platform as a research-grade Saudi reference center, we need causal methods.

**Problem 4: Wrong decisions for individual beneficiaries**

When deciding between interventions A and B for a specific beneficiary, the question is: which intervention produces better outcomes **for this person's profile**? Predictive models tell us "A has historically improved outcomes by X." Causal models tell us "A caused improvement in similar beneficiaries by Y, while B caused improvement by Z, and the difference is statistically significant."

### 1.4 Why this is hard

Causal inference in clinical settings is hard because **randomized controlled trials (RCTs)** are often impossible:

- We cannot ethically deny rehab to a control group
- We cannot randomize beneficiaries between therapist styles
- We cannot assign intensity arbitrarily
- We cannot withhold family engagement

So we use **quasi-experimental methods** that approximate causal inference from observational data. These are well-developed in econometrics and increasingly in clinical research.

---

## 2. The Three Methods — Layered Architecture

The Causal Engine combines three complementary methods, each with strengths and weaknesses:

```text
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Propensity Score Matching                          │
│   - For interventions with clear treated/untreated groups   │
│   - Matches similar beneficiaries on probability of treatment│
│   - Cheap, fast, intuitive                                  │
├─────────────────────────────────────────────────────────────┤
│ Layer 2: Difference-in-Differences (DiD)                    │
│   - For interventions with pre/post + control cohort        │
│   - Controls for time-trends + maturation                   │
│   - More credible than pre/post alone                       │
├─────────────────────────────────────────────────────────────┤
│ Layer 3: Synthetic Control Groups                           │
│   - For unique beneficiaries with no matched control         │
│   - Constructs weighted synthetic match from historical data │
│   - Most powerful for n=1 causal claims                     │
└─────────────────────────────────────────────────────────────┘
```

Each method is appropriate in different scenarios. The engine routes to the right method based on data availability + question type.

---

## 3. Layer 1 — Propensity Score Matching (PSM)

### 3.1 The intuition

Suppose we want to know: "Does intensive OT (3x/week) produce better outcomes than standard OT (1x/week) for children with autism?"

We have:

- 80 children who received intensive OT
- 200 children who received standard OT
- But assignment was not random — sicker children may have been assigned intensive

**PSM approach**:

1. For every child, calculate the **propensity score** = probability they would have received intensive OT, given their characteristics (severity, age, family circumstances, prior PT exposure, etc.)
2. Match each intensive-treated child to a standard-treated child with similar propensity score
3. Compare outcomes within matched pairs
4. The difference is the **average treatment effect** (ATE)

### 3.2 Algorithm pseudocode

```javascript
// backend/intelligence/causal/propensity-score-matching.lib.js
// Pure function pattern per ADR-011

/**
 * Estimate causal effect via propensity score matching.
 *
 * @param {Array<Beneficiary>} treatedGroup - received the intervention
 * @param {Array<Beneficiary>} controlGroup - did not receive
 * @param {Array<string>} covariates - variables to match on
 * @param {string} outcomeMetric - e.g., 'gasTScoreDelta', 'icfImprovementCount'
 * @param {Object} options
 * @returns {{ ate: number, se: number, ci95: [number, number], matchedPairs: number, ... }}
 */
function estimateATEviaPSM(treatedGroup, controlGroup, covariates, outcomeMetric, options = {}) {
  // Step 1: Estimate propensity scores via logistic regression
  const allBeneficiaries = [...treatedGroup, ...controlGroup];
  const propensityModel = fitLogisticRegression({
    features: allBeneficiaries.map(b => extractFeatures(b, covariates)),
    labels: allBeneficiaries.map(b => (treatedGroup.includes(b) ? 1 : 0)),
  });

  // Step 2: Calculate propensity score for each beneficiary
  const withScores = allBeneficiaries.map(b => ({
    beneficiary: b,
    propensityScore: propensityModel.predict(extractFeatures(b, covariates)),
    isTreated: treatedGroup.includes(b),
  }));

  // Step 3: Match each treated to nearest control by propensity score
  const matches = [];
  const matchingMethod = options.method || 'nearest_neighbor';
  const caliper = options.caliper || 0.1; // max propensity score difference

  for (const treated of withScores.filter(s => s.isTreated)) {
    const eligibleControls = withScores
      .filter(s => !s.isTreated && !matches.some(m => m.control === s.beneficiary))
      .map(s => ({
        ...s,
        scoreDiff: Math.abs(s.propensityScore - treated.propensityScore),
      }))
      .filter(s => s.scoreDiff <= caliper)
      .sort((a, b) => a.scoreDiff - b.scoreDiff);

    if (eligibleControls.length === 0) continue; // unmatched treated case

    matches.push({
      treated: treated.beneficiary,
      control: eligibleControls[0].beneficiary,
      propensityScoreDiff: eligibleControls[0].scoreDiff,
    });
  }

  // Step 4: Compute ATE
  const pairDiffs = matches.map(m => getOutcome(m.treated, outcomeMetric) - getOutcome(m.control, outcomeMetric));
  const ate = mean(pairDiffs);
  const se = standardError(pairDiffs);
  const ci95 = [ate - 1.96 * se, ate + 1.96 * se];

  // Step 5: Quality diagnostics
  const balanceCheck = checkCovariateBalance(matches, covariates);

  return {
    ate: Number(ate.toFixed(3)),
    se: Number(se.toFixed(3)),
    ci95: ci95.map(v => Number(v.toFixed(3))),
    matchedPairs: matches.length,
    unmatchedTreatedCount: treatedGroup.length - matches.length,
    propensityScoreRange: {
      min: Math.min(...withScores.map(s => s.propensityScore)),
      max: Math.max(...withScores.map(s => s.propensityScore)),
    },
    balanceCheck,
    methodology: 'PSM',
    options: { ...options, matchingMethod, caliper },
  };
}
```

### 3.3 When to use PSM

**Good for**:

- Comparing two well-defined interventions
- N>40 in each group ideally (smaller possible with caveats)
- Clear assignment mechanism that we can model
- Outcomes measured similarly across groups

**Not good for**:

- Highly individualized treatments (no comparable group)
- When propensity scores have no overlap (all treated have score >0.7, all controls <0.3)
- When unmeasured confounders are strong

---

## 4. Layer 2 — Difference-in-Differences (DiD)

### 4.1 The intuition

Suppose we want to know: "Did introducing the new SLP program at Branch A improve speech outcomes vs. Branch B (which kept the old program)?"

Naive comparison: "Branch A outcomes after > before" → but maybe outcomes everywhere improved due to general trends.

**DiD approach**:

1. Measure outcomes at Branch A before and after the program change
2. Measure outcomes at Branch B before and after (same time periods)
3. Calculate: `(A_after - A_before) - (B_after - B_before)`
4. This is the **treatment effect** isolated from general trends

### 4.2 Algorithm pseudocode

```javascript
// backend/intelligence/causal/difference-in-differences.lib.js

/**
 * Estimate causal effect via difference-in-differences.
 *
 * @param {Object} input
 * @param {Array<Outcome>} input.treatedPreOutcomes
 * @param {Array<Outcome>} input.treatedPostOutcomes
 * @param {Array<Outcome>} input.controlPreOutcomes
 * @param {Array<Outcome>} input.controlPostOutcomes
 * @param {string} input.outcomeMetric
 * @returns {{ did: number, se: number, ci95: [number, number], assumptions: Object }}
 */
function estimateDiD(input) {
  const { treatedPreOutcomes, treatedPostOutcomes, controlPreOutcomes, controlPostOutcomes, outcomeMetric } = input;

  // Step 1: Calculate means
  const treatedPreMean = mean(treatedPreOutcomes.map(o => o[outcomeMetric]));
  const treatedPostMean = mean(treatedPostOutcomes.map(o => o[outcomeMetric]));
  const controlPreMean = mean(controlPreOutcomes.map(o => o[outcomeMetric]));
  const controlPostMean = mean(controlPostOutcomes.map(o => o[outcomeMetric]));

  // Step 2: DiD estimate
  const treatedDelta = treatedPostMean - treatedPreMean;
  const controlDelta = controlPostMean - controlPreMean;
  const did = treatedDelta - controlDelta;

  // Step 3: Standard error via panel regression
  // Run: outcome ~ treated + post + treated*post  (the coefficient on the interaction is DiD)
  const regression = fitPanelRegression({
    outcome: [...treatedPreOutcomes, ...treatedPostOutcomes, ...controlPreOutcomes, ...controlPostOutcomes].map(o => o[outcomeMetric]),
    treated: [
      ...Array(treatedPreOutcomes.length + treatedPostOutcomes.length).fill(1),
      ...Array(controlPreOutcomes.length + controlPostOutcomes.length).fill(0),
    ],
    post: [
      ...Array(treatedPreOutcomes.length).fill(0),
      ...Array(treatedPostOutcomes.length).fill(1),
      ...Array(controlPreOutcomes.length).fill(0),
      ...Array(controlPostOutcomes.length).fill(1),
    ],
    clusterSE: true, // cluster standard errors by beneficiary
  });

  const didCoef = regression.coefficients.interaction;
  const se = regression.standardErrors.interaction;
  const ci95 = [didCoef - 1.96 * se, didCoef + 1.96 * se];

  // Step 4: Assumption checks
  const parallelTrendsTest = checkParallelTrends(treatedPreOutcomes, controlPreOutcomes);

  return {
    did: Number(did.toFixed(3)),
    didCoefRegression: Number(didCoef.toFixed(3)),
    se: Number(se.toFixed(3)),
    ci95: ci95.map(v => Number(v.toFixed(3))),
    means: {
      treatedPre: Number(treatedPreMean.toFixed(3)),
      treatedPost: Number(treatedPostMean.toFixed(3)),
      controlPre: Number(controlPreMean.toFixed(3)),
      controlPost: Number(controlPostMean.toFixed(3)),
    },
    sampleSizes: {
      treatedPre: treatedPreOutcomes.length,
      treatedPost: treatedPostOutcomes.length,
      controlPre: controlPreOutcomes.length,
      controlPost: controlPostOutcomes.length,
    },
    assumptions: {
      parallelTrends: parallelTrendsTest, // p-value of pre-trends test
      noSpilloverAssumed: true, // documented assumption
      stableUnitTreatmentAssumed: true, // documented assumption
    },
    methodology: 'DiD',
  };
}
```

### 4.3 When to use DiD

**Good for**:

- Policy/program changes affecting a defined group
- Clear pre/post observation
- Control group that didn't experience the change
- Parallel trends assumption testable (with pre-period data)

**Not good for**:

- When the treated and control groups diverge in trends before intervention
- When spillover between groups is plausible
- When the intervention itself changes the composition of the group

---

## 5. Layer 3 — Synthetic Control Groups (SCM)

### 5.1 The intuition

Sometimes the beneficiary is unique. No matched control exists. But we have rich historical data on many similar beneficiaries who experienced different interventions.

**SCM approach** (Abadie et al. 2010):

1. Take historical beneficiaries who did NOT receive the intervention
2. Build a weighted combination of them that **best matches** the target beneficiary's pre-intervention characteristics
3. Apply that weighted combination forward in time → predicted counterfactual
4. The difference between actual outcome and counterfactual is the causal effect

### 5.2 Algorithm pseudocode

```javascript
// backend/intelligence/causal/synthetic-control.lib.js

/**
 * Estimate causal effect for a single beneficiary via synthetic control.
 *
 * @param {Object} input
 * @param {Beneficiary} input.targetBeneficiary
 * @param {string} input.intervention - intervention identifier
 * @param {Date} input.interventionStartDate
 * @param {Array<Beneficiary>} input.donorPool - historical beneficiaries WITHOUT this intervention
 * @param {Array<string>} input.matchingCovariates
 * @param {string} input.outcomeMetric
 * @returns {SyntheticControlResult}
 */
function estimateSyntheticControl(input) {
  const { targetBeneficiary, intervention, interventionStartDate, donorPool, matchingCovariates, outcomeMetric } = input;

  // Step 1: Extract pre-intervention trajectories
  const targetPreTrajectory = extractTrajectory(targetBeneficiary, interventionStartDate, 'pre', outcomeMetric);

  const donorPreTrajectories = donorPool
    .map(d => ({
      beneficiaryId: d._id,
      trajectory: extractTrajectoryRelative(d, interventionStartDate, 'pre', outcomeMetric),
      covariates: extractFeatures(d, matchingCovariates),
    }))
    .filter(d => d.trajectory.length >= 3); // need pre-period data

  if (donorPreTrajectories.length < 20) {
    return {
      valid: false,
      reason: 'INSUFFICIENT_DONOR_POOL',
      donorCount: donorPreTrajectories.length,
    };
  }

  // Step 2: Solve for optimal weights
  // Minimize: || targetPreTrajectory - Σ(w_i × donorPreTrajectories_i) ||
  // Subject to: w_i >= 0, Σw_i = 1

  const weights = solveConvexOptimization({
    target: targetPreTrajectory,
    donors: donorPreTrajectories.map(d => d.trajectory),
    covariateMatch: {
      targetCovariates: extractFeatures(targetBeneficiary, matchingCovariates),
      donorCovariates: donorPreTrajectories.map(d => d.covariates),
    },
  });

  // Step 3: Construct synthetic counterfactual for post-intervention period
  const postPeriodLength = differenceInDays(new Date(), interventionStartDate);
  const syntheticCounterfactual = [];

  for (let day = 0; day <= postPeriodLength; day += 7) {
    let synthValue = 0;
    let totalWeight = 0;

    for (let i = 0; i < donorPreTrajectories.length; i++) {
      const donorOutcomeAtDay = getOutcomeAtRelativeDay(donorPreTrajectories[i].beneficiaryId, day, 'post-relative', outcomeMetric);
      if (donorOutcomeAtDay != null) {
        synthValue += weights[i] * donorOutcomeAtDay;
        totalWeight += weights[i];
      }
    }

    if (totalWeight > 0) {
      syntheticCounterfactual.push({
        daysAfterIntervention: day,
        counterfactualValue: synthValue / totalWeight,
        actualValue: getOutcomeAtRelativeDay(targetBeneficiary, day, 'post', outcomeMetric),
      });
    }
  }

  // Step 4: Calculate treatment effect over time
  const treatmentEffects = syntheticCounterfactual
    .filter(s => s.actualValue != null)
    .map(s => ({
      day: s.daysAfterIntervention,
      effect: s.actualValue - s.counterfactualValue,
      actual: s.actualValue,
      counterfactual: s.counterfactualValue,
    }));

  // Step 5: Permutation inference (placebo tests)
  const placeboEffects = runPlaceboTests({
    donorPool: donorPreTrajectories,
    interventionStartDate,
    matchingCovariates,
    outcomeMetric,
    numPlacebos: 20,
  });

  const finalEffect = treatmentEffects[treatmentEffects.length - 1]?.effect;
  const placeboPValue = calculateRankPValue(finalEffect, placeboEffects);

  // Step 6: Quality diagnostics
  const preInterventionFit = calculateRMSE(targetPreTrajectory, syntheticCounterfactual.slice(0, targetPreTrajectory.length));

  return {
    valid: true,
    methodology: 'SCM',
    intervention,
    targetBeneficiaryId: targetBeneficiary._id,

    causalEffect: {
      finalEffect: Number(finalEffect?.toFixed(3) ?? 0),
      effectsOverTime: treatmentEffects,
      placeboPValue: Number(placeboPValue.toFixed(4)),
    },

    syntheticConstruction: {
      donorWeights: donorPreTrajectories
        .map((d, i) => ({
          beneficiaryId: d.beneficiaryId,
          weight: Number(weights[i].toFixed(4)),
        }))
        .filter(d => d.weight > 0.01)
        .sort((a, b) => b.weight - a.weight),
      preInterventionRMSE: Number(preInterventionFit.toFixed(3)),
    },

    diagnostics: {
      donorPoolSize: donorPreTrajectories.length,
      placeboTestsRun: placeboEffects.length,
      preInterventionFitQuality: preInterventionFit < 5 ? 'good' : preInterventionFit < 10 ? 'fair' : 'poor',
    },
  };
}
```

### 5.3 When to use SCM

**Good for**:

- Single-case causal claims
- Rich pre-intervention data (≥3 observations)
- Large donor pool (≥20 candidates without the intervention)
- Unique or rare beneficiary profiles

**Not good for**:

- Sparse data
- When donors are systematically different in unobserved ways
- When the intervention effect is small relative to noise

---

## 6. Method Selection — When to Use Which

```javascript
// backend/intelligence/causal/method-selector.lib.js

function selectCausalMethod(researchQuestion) {
  const {
    questionType, // 'individual', 'cohort', 'policy'
    treatedGroupSize,
    controlGroupSize,
    preInterventionData, // booleans for each side
    interventionType, // 'binary', 'continuous', 'multilevel'
    timeStructure, // 'cross-sectional', 'panel', 'time-series'
  } = researchQuestion;

  // Decision tree

  if (questionType === 'individual') {
    if (preInterventionData.target && controlGroupSize >= 20) {
      return { primary: 'SCM', fallback: 'PSM' };
    }
    return { primary: 'PSM', fallback: null, warning: 'individual_no_pre_data' };
  }

  if (questionType === 'policy') {
    // Best for DiD: clear pre/post + control branch/region
    if (timeStructure === 'panel' && controlGroupSize > 0) {
      return { primary: 'DiD', fallback: 'PSM' };
    }
    return { primary: 'PSM', fallback: null, warning: 'policy_no_control' };
  }

  if (questionType === 'cohort') {
    if (treatedGroupSize >= 30 && controlGroupSize >= 30) {
      return { primary: 'PSM', fallback: null };
    }
    if (treatedGroupSize >= 20 && controlGroupSize >= 20 && preInterventionData.both) {
      return { primary: 'DiD', fallback: 'PSM' };
    }
    return {
      primary: null,
      warning: 'INSUFFICIENT_DATA',
      recommendation: 'Wait for more data; report descriptive statistics only',
    };
  }

  return { primary: null, warning: 'UNCLASSIFIED_QUESTION' };
}
```

---

## 7. Architecture & Data Flow

```text
┌──────────────────────────────────────────────────────────────────┐
│                    Causal Inference Engine                        │
└──────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  Question Intake API                                              │
│  POST /api/causal/research-question                               │
│  Input: { questionType, intervention, populationFilter, outcome } │
└──────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  Method Selector                                                  │
│  Routes to SCM / DiD / PSM based on data availability             │
└──────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  Data Assembly                                                    │
│  - Query treated + control beneficiaries                          │
│  - Extract outcomes (ICF qualifiers + GAS T-scores)               │
│  - Build matching covariates                                      │
│  - Privacy filter (k-anonymity ≥ 5)                              │
└──────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  Method Execution                                                 │
│  - Run selected method (SCM/DiD/PSM)                              │
│  - Compute effect size + SE + CI                                  │
│  - Run diagnostic checks                                          │
│  - Run placebo/falsification tests                                │
└──────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  Quality Gate                                                     │
│  - Minimum sample sizes met?                                      │
│  - Diagnostic checks passed?                                      │
│  - Methodology assumptions defensible?                            │
└──────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  Result Storage                                                   │
│  - CausalInferenceResult document persisted                       │
│  - Full audit trail (data version, method, assumptions)           │
│  - Reproducibility metadata (random seed, dependencies)           │
└──────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  Interpretation & Reporting                                        │
│  - Plain Arabic + English narrative                               │
│  - Visualization (effect over time, CI bands)                     │
│  - Clinical context interpretation                                │
│  - Limitations + caveats                                          │
└──────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  Clinical Review (REQUIRED before treatment decision impact)      │
│  - Clinician reviews the causal claim                             │
│  - Marks "actionable" / "informational" / "rejected"              │
│  - If actionable: feeds into Phase 4 (Active Care) decisions      │
└──────────────────────────────────────────────────────────────────┘
```

---

## 8. Database Schema

### 8.1 New collection: `CausalInferenceResult`

```javascript
// backend/models/CausalInferenceResult.js

const CausalInferenceResultSchema = new Schema(
  {
    // Question metadata
    researchQuestionId: { type: ObjectId, ref: 'ResearchQuestion' },
    questionType: {
      type: String,
      enum: ['individual', 'cohort', 'policy'],
      required: true,
    },
    intervention: {
      type: String,
      required: true,
      index: true,
    },
    outcomeMetric: { type: String, required: true },

    // Methodology
    methodology: {
      type: String,
      enum: ['PSM', 'DiD', 'SCM'],
      required: true,
      index: true,
    },
    methodVersion: { type: String, default: 'v1' },

    // For individual-level results (SCM typically)
    targetBeneficiaryId: { type: ObjectId, ref: 'Beneficiary' },

    // Effect estimate
    causalEffect: {
      pointEstimate: { type: Number, required: true },
      standardError: { type: Number },
      ci95Lower: { type: Number },
      ci95Upper: { type: Number },
      pValue: { type: Number },
      direction: {
        type: String,
        enum: ['positive', 'negative', 'null', 'inconclusive'],
      },
    },

    // Sample
    sample: {
      treatedCount: { type: Number, required: true },
      controlCount: { type: Number, required: true },
      matchedPairs: { type: Number },
      donorPoolSize: { type: Number },
      populationFilter: { type: Schema.Types.Mixed },
    },

    // Diagnostics
    diagnostics: {
      parallelTrendsTest: { pValue: Number, passed: Boolean },
      covariateBalance: { type: Schema.Types.Mixed },
      placeboTestResults: [{ effect: Number, pValue: Number }],
      preInterventionFitQuality: { type: String },
      sensitivityToAlternativeSpecifications: { type: Schema.Types.Mixed },
    },

    // Reproducibility
    reproducibility: {
      randomSeed: { type: Number },
      libraryVersion: { type: String },
      dataSnapshotTimestamp: { type: Date },
      dataHash: { type: String }, // hash of the input data
    },

    // Interpretation
    interpretation: {
      narrativeEn: { type: String },
      narrativeAr: { type: String },
      clinicalSignificance: {
        type: String,
        enum: ['clinically_meaningful', 'statistically_significant_only', 'inconclusive', 'not_significant'],
      },
      limitations: [String],
      caveats: [String],
    },

    // Review status
    clinicalReview: {
      status: {
        type: String,
        enum: ['pending', 'actionable', 'informational', 'rejected'],
        default: 'pending',
      },
      reviewedBy: { type: ObjectId, ref: 'User' },
      reviewedAt: { type: Date },
      reviewNotes: { type: String },
    },

    // Audit
    computedBy: { type: ObjectId, ref: 'User' },
    computedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['draft', 'computed', 'reviewed', 'published', 'retracted'],
      default: 'computed',
    },
  },
  {
    timestamps: true,
    collection: 'causal_inference_results',
  },
);

CausalInferenceResultSchema.index({ intervention: 1, methodology: 1, computedAt: -1 });
CausalInferenceResultSchema.index({ targetBeneficiaryId: 1 });
CausalInferenceResultSchema.index({ 'clinicalReview.status': 1 });
```

### 8.2 New collection: `ResearchQuestion`

```javascript
// backend/models/ResearchQuestion.js
// Tracks questions submitted to the causal engine, allowing reuse + iteration

const ResearchQuestionSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },

    questionType: { type: String, enum: ['individual', 'cohort', 'policy'], required: true },

    intervention: {
      type: { type: String }, // 'treatment', 'program_change', 'staffing', etc.
      identifier: { type: String, required: true },
      description: { type: String },
    },

    outcomeOfInterest: {
      metric: { type: String, required: true }, // 'gasTScoreDelta', 'icfQualifierImprovement', etc.
      icfDomain: { type: String },
      aggregation: { type: String, enum: ['change', 'level', 'rate'], default: 'change' },
    },

    populationFilter: {
      ageRange: { min: Number, max: Number },
      diagnoses: [String],
      severityRange: { min: Number, max: Number },
      branchIds: [{ type: ObjectId, ref: 'Branch' }],
    },

    hypotheses: [String],

    submittedBy: { type: ObjectId, ref: 'User' },
    submittedAt: { type: Date, default: Date.now },

    status: {
      type: String,
      enum: ['proposed', 'approved', 'in-progress', 'completed', 'archived'],
      default: 'proposed',
    },

    // Multiple causal results may answer this question (different methodologies, time periods)
    results: [{ type: ObjectId, ref: 'CausalInferenceResult' }],
  },
  {
    timestamps: true,
    collection: 'research_questions',
  },
);
```

---

## 9. API Design

### 9.1 Research question submission

```javascript
POST /api/causal/research-questions
     Submit a new research question
     MFA: tier 2 (research-grade question)
     Body: { title, description, questionType, intervention, outcomeOfInterest, populationFilter, hypotheses }
     Returns: ResearchQuestion document

GET  /api/causal/research-questions
     List research questions
     Query: status, intervention, submittedBy
     MFA: tier 1

GET  /api/causal/research-questions/:id
     Returns full question + linked results
```

### 9.2 Causal analysis execution

```javascript
POST /api/causal/analyze
     Execute causal analysis for a research question
     MFA: tier 2
     Body: {
       researchQuestionId,
       methodology: 'PSM' | 'DiD' | 'SCM' | 'auto',
       options: { caliper, alpha, donorPoolSize, ... }
     }
     Returns: CausalInferenceResult document
     Note: long-running, may return job ID + status endpoint

GET  /api/causal/jobs/:jobId
     Check causal analysis job status

GET  /api/causal/results/:resultId
     Get causal result details

POST /api/causal/results/:resultId/review
     Clinical review of causal result
     MFA: tier 2 (clinical assertion)
     Body: { status: 'actionable' | 'informational' | 'rejected', notes }
```

### 9.3 Individual-level causal estimates

```javascript
GET  /api/beneficiaries/:id/causal-estimates
     Returns all causal results for this beneficiary

POST /api/beneficiaries/:id/causal-estimate
     Compute causal estimate for this beneficiary + intervention
     MFA: tier 2
     Body: { intervention, comparisonGroup: 'historical' | 'synthetic' }
     Returns: CausalInferenceResult
```

### 9.4 Population-level reports

```text
GET  /api/causal/intervention-effects
     List established intervention effects across the population
     Query: intervention, populationFilter
     Returns: aggregated causal evidence

POST /api/causal/program-evaluation
     Causal evaluation of a clinical program
     MFA: tier 3 (governance)
     Body: { programId, period: {from, to}, outcomeMetrics: [...] }
     Returns: comprehensive program evaluation report
```

---

## 10. Ethical Guardrails — Non-Negotiable

### 10.1 No beneficiary denied care to serve as control

**Rule**: We never assign beneficiaries to no-treatment groups for research purposes. All control groups are constructed from **historical or naturally-occurring** variation.

### 10.2 Minimum sample sizes enforced

| Use case                      | Minimum sample                                    |
| ----------------------------- | ------------------------------------------------- |
| Individual treatment decision | ≥50 matched controls (PSM/SCM)                    |
| Program-level decision        | ≥200 in each comparison group                     |
| Public claims/publications    | ≥500 in each comparison group                     |
| Insurer reporting             | ≥200 with replication across 2+ centers preferred |

Below these thresholds, results are marked **'inconclusive'** and may not drive decisions.

### 10.3 Confidence intervals always reported

Point estimates without CIs are never displayed. UI/API enforces this.

### 10.4 Clinical review required before treatment decision impact

A causal result with `clinicalReview.status === 'actionable'` is the only state that can:

- Be cited in a treatment decision rationale
- Drive an AI recommendation
- Be presented to families as actionable evidence

Results in 'pending' / 'informational' / 'rejected' states are read-only context.

### 10.5 Algorithmic fairness audit on causal models

Quarterly: third-party audit of causal models to detect:

- Disparate effect estimates across demographic groups
- Systematic bias in matching
- Differential coverage (some groups under-served)
- Confounding by unmeasured variables that correlate with demographics

### 10.6 Right to opt-out

Beneficiaries/families can opt-out of:

- Being part of donor pools (default opt-in with consent)
- Having causal estimates computed on their own outcomes
- Having their outcomes contribute to program-level evaluations

Opt-out is honored without affecting care quality. Annual audit verifies no outcome differential.

### 10.7 Reversibility

If a causal result is later found to be flawed:

- Mark as 'retracted' (not deleted)
- Document reason
- Notify all parties who acted on it
- Re-evaluate decisions made based on it

---

## 11. Validation Strategy

### 11.1 Synthetic data benchmarks

Before deploying on real data, validate methods against synthetic data where the true causal effect is known:

```javascript
// backend/__tests__/causal/synthetic-data-benchmarks.test.js
// Run methods on simulated data with known true effects
// Pass criterion: methods recover true effect within 95% CI in 95% of trials

describe('PSM benchmarks', () => {
  it('recovers true ATE on simulated data', () => {
    const trueEffect = 5.0;
    const simResults = runSimulation({
      method: 'PSM',
      trueEffect,
      n: 100,
      trials: 1000,
    });
    expect(simResults.coverageRate).toBeGreaterThan(0.93); // approx. 95%
    expect(simResults.medianEstimate).toBeCloseTo(trueEffect, 0.5);
  });
});
```

### 11.2 Cross-method consistency

For questions where multiple methods are applicable, run all three and check consistency:

```text
researchQuestion (e.g., "Does intensive PT improve walking?")
├── PSM result: ATE = 4.2 (CI: 3.1, 5.3)
├── DiD result: DiD = 4.8 (CI: 3.5, 6.1)
└── SCM result: 5.0 (placebo p = 0.02)
```

Three converging estimates → high confidence. Divergent estimates → investigate.

### 11.3 Falsification tests

For each causal result, run falsification tests:

- **Placebo intervention**: assign fake intervention to control group → effect should be ~0
- **Placebo outcome**: use an outcome that shouldn't be affected → effect should be ~0
- **Placebo timing**: shift intervention date back to a period of no real intervention → effect should be ~0

### 11.4 Sensitivity analysis

Each result reports sensitivity to:

- Alternative caliper widths (PSM)
- Alternative donor pool sizes (SCM)
- Alternative control group definitions (DiD)
- Inclusion/exclusion of borderline matches

If results are highly sensitive, flag the finding.

---

## 12. User Interface

### 12.1 Researcher Workspace (Supervisor Cockpit extension)

```text
┌──────────────────────────────────────────────────────────────────┐
│ Causal Analysis Workbench                                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  📋 My Research Questions          ┃  📊 Results Dashboard        │
│  ─────────────────────────         ┃  ──────────────────          │
│  - Effect of intensive PT          ┃  - 23 active questions       │
│  - Branch SLP program impact       ┃  - 47 completed analyses     │
│  - Telehealth vs in-person         ┃  - 12 actionable results     │
│                                    ┃                              │
│  [+ New Research Question]         ┃  [Browse all results]        │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

### 12.2 Result detail view

Each causal result has:

- Plain Arabic + English narrative summary
- Visualization: effect over time with CI bands
- Methodology badge (PSM/DiD/SCM)
- Quality indicators (sample size, diagnostics)
- Clinical review status
- Citations to underlying data
- Limitations + caveats explicitly displayed

### 12.3 Family-facing translation

When a causal result drives a recommendation to a family, the family sees:

- Plain language explanation (avoiding statistical jargon)
- Confidence level (high/medium/low — not p-values)
- Sample size in lay terms ("based on outcomes from 247 children similar to yours")
- Always: "this is one piece of evidence — your clinician knows your specific situation"

---

## 13. Implementation Plan (8 weeks, W421-W435)

| Wave | Focus                                                                 | Effort |
| ---- | --------------------------------------------------------------------- | ------ |
| W421 | Pure-lib foundation: PSM algorithm + unit tests                       | 4 days |
| W422 | Pure-lib: DiD algorithm + unit tests                                  | 4 days |
| W423 | Pure-lib: SCM algorithm + unit tests                                  | 6 days |
| W424 | Method selector + integration                                         | 3 days |
| W425 | CausalInferenceResult + ResearchQuestion models                       | 3 days |
| W426 | Data assembly layer (extract treated/control + outcomes)              | 5 days |
| W427 | Privacy filter (k-anonymity ≥ 5) + opt-out enforcement                | 3 days |
| W428 | Synthetic data benchmark suite                                        | 4 days |
| W429 | API endpoints + MFA tier enforcement                                  | 4 days |
| W430 | Job queue + async execution                                           | 3 days |
| W431 | Diagnostic checks + falsification tests                               | 4 days |
| W432 | Interpretation/narrative generation (LLM-assisted, evidence-grounded) | 4 days |
| W433 | UI: Researcher Workspace + Result Detail                              | 5 days |
| W434 | UI: Family-facing translation layer                                   | 3 days |
| W435 | End-to-end smoke + drift guards + documentation                       | 4 days |

Total: ~59 person-days ≈ 8 weeks at 1 FTE.

---

## 14. Success Criteria — Phase D Done When

- ✅ Three methods (PSM, DiD, SCM) operational + unit-tested
- ✅ Synthetic data benchmarks pass (95% coverage on simulations)
- ✅ At least 5 real-world causal questions answered (with results stored)
- ✅ At least 2 different methodologies converging on same question (cross-method consistency demonstrated)
- ✅ Clinical review workflow operational
- ✅ Privacy/opt-out enforcement verified
- ✅ Quarterly algorithmic fairness audit completed
- ✅ At least 1 family-facing translation surfaced
- ✅ Documentation: methodology guide for clinicians + glossary for families

---

## 15. Open Questions

### Q1 — Who is authorized to submit research questions?

- (a) Clinical Director only
- (b) Any supervisor
- (c) Any senior therapist
- (d) Tiered (cohort questions by supervisors, individual questions by clinicians)

**Recommendation**: (d).

### Q2 — How are causal results presented to families when adverse?

If a causal result shows an intervention did NOT cause improvement, how is this communicated?

- (a) Privately to clinician only; clinician decides
- (b) Always surfaced to family
- (c) Surfaced when treatment plan changes as result
- (d) Quarterly summary

**Recommendation**: (c) — transparency without information overload.

### Q3 — Causal model retraining cadence

- (a) Real-time (continuous)
- (b) Weekly
- (c) Monthly
- (d) Quarterly with full validation

**Recommendation**: (d) — slow, careful, transparent over fast and surprising.

### Q4 — Federated causal estimates (Phase H integration)

When Phase H builds, can causal models be trained federated across centers?

- (a) Yes, full federation
- (b) Yes, but only PSM (simplest)
- (c) Aggregate only — each center estimates, then meta-analysis
- (d) Defer decision

**Recommendation**: (c) — meta-analysis from per-center estimates avoids PHI movement while still benefiting from scale.

### Q5 — Causal results in legal proceedings

If a family sues, can our causal results be subpoenaed and used as evidence?

- (a) Treat as discoverable
- (b) Protect as research data
- (c) Depends on local law (Saudi: defer to Disability Authority + MOH guidance)
- (d) Document case-by-case

**Recommendation**: (c) + legal review.

---

## 16. References

### Foundational papers

- Rubin, D. B. (1974). Estimating causal effects of treatments in randomized and nonrandomized studies. _Journal of Educational Psychology_.
- Rosenbaum, P. R., & Rubin, D. B. (1983). The central role of the propensity score in observational studies for causal effects. _Biometrika_.
- Abadie, A., Diamond, A., & Hainmueller, J. (2010). Synthetic control methods for comparative case studies. _Journal of the American Statistical Association_.
- Card, D., & Krueger, A. B. (1994). Minimum wages and employment: A case study of the fast-food industry in New Jersey and Pennsylvania (the canonical DiD application). _American Economic Review_.

### Clinical applications

- Stuart, E. A. (2010). Matching methods for causal inference. _Statistical Science_.
- Bonell, C. P., et al. (2011). Realist randomised controlled trials. _Trials_.
- Hernan, M. A., & Robins, J. M. (2020). _Causal Inference: What If_. Chapman & Hall.

### Healthcare-specific

- Athey, S., & Imbens, G. (2017). The state of applied econometrics — Causality and policy evaluation. _Journal of Economic Perspectives_.
- Goodman-Bacon, A. (2021). Difference-in-differences with variation in treatment timing. _Journal of Econometrics_.

### Saudi/regional context

- (To be added: Saudi healthcare causal inference papers — currently sparse, an opportunity for our research contribution)

---

## 17. Document History

- **2026-05-26**: Initial draft. Status: 🟡 Design Proposal — **DEFERRED under Option 4 of ADR-031**.
- **Future**: Activated when (a) ADR-031 approved with full Option 3 OR (b) Phase A completed + 6+ months of data accumulated + engineering capacity available.
