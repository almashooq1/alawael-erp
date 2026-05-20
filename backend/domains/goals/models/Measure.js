/**
 * Measure Model — مكتبة المقاييس المركزية
 *
 * مقياس تقييمي موحد يمثل أداة تقييم سريرية معتمدة.
 * أمثلة: Vineland, PDMS, Denver, Bayley, CARS, ABC, etc.
 *
 * Wave 210 — Governance layer:
 *   • SemVer-enforced `version` + lifecycle (effectiveFrom/Until, supersededBy)
 *   • `purpose` taxonomy (screening|diagnostic|outcome|...)
 *   • Required `derivedType` + `interpretationStyle` for outcome measures
 *     (closes the SCQ/W206b silent-fallback regression class)
 *   • MCID/SDC with citation requirement (no "we made it up" guard)
 *   • Eligibility rules (icd10, prerequisiteMeasures, conflictsWith,
 *     certificationRequired)
 *   • Reassessment cadence (standardIntervalDays + cooldown)
 *   • Cautions / contraindications block
 *   • Smart-engine linkage (goalTemplateRefs, programLibraryHints)
 *   • Reporting block (CBAHI/MOHRSD/family-friendly)
 *   • Sensitivity grade (LOW|MEDIUM|HIGH|CRITICAL) — feeds intelligence/sensitivity-grade.lib
 *   • MeasureRevision audit hook on every save
 *
 * @module domains/goals/models/Measure
 */

const mongoose = require('mongoose');

const SEMVER_RE = /^\d+\.\d+\.\d+$/;
const ICD10_RE = /^[A-Z]\d{2}(\.\d+)?(\.\*)?$|^[A-Z]\d{2}\.\*$/i;
const OUTCOME_PURPOSES = new Set(['outcome', 'functional_status', 'risk_stratification']);

const scoringRuleSchema = new mongoose.Schema(
  {
    rangeLabel: String,
    rangeLabel_ar: String,
    minScore: Number,
    maxScore: Number,
    interpretation: String,
    interpretation_ar: String,
    color: String,
    severity: { type: String, enum: ['normal', 'mild', 'moderate', 'severe', 'critical'] },
  },
  { _id: true }
);

const domainDefinitionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    name: { type: String, required: true },
    name_ar: String,
    description: String,
    maxScore: Number,
    weight: { type: Number, default: 1 },
    items: [
      {
        label: String,
        label_ar: String,
        maxScore: Number,
        scoringType: {
          type: String,
          enum: ['numeric', 'likert', 'binary', 'percentage', 'rating'],
        },
        options: [{ value: Number, label: String, label_ar: String }],
      },
    ],
  },
  { _id: true }
);

const measureSchema = new mongoose.Schema(
  {
    // ── Identity ───────────────────────────────────────────────────────
    code: { type: String, unique: true, required: true, index: true },
    name: { type: String, required: true },
    name_ar: String,
    abbreviation: String,
    version: String,
    description: String,
    description_ar: String,

    // ── Classification ─────────────────────────────────────────────────
    category: {
      type: String,
      enum: [
        'developmental',
        'behavioral',
        'cognitive',
        'motor',
        'speech_language',
        'social',
        'adaptive',
        'academic',
        'sensory',
        'quality_of_life',
        'functional',
        'screening',
        'diagnostic',
        'outcome',
        'custom',
      ],
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'standardized',
        'criterion_referenced',
        'norm_referenced',
        'checklist',
        'rating_scale',
        'observation',
        'interview',
        'custom',
      ],
      default: 'standardized',
    },
    targetPopulation: [
      {
        type: String,
        enum: [
          'children',
          'adolescents',
          'adults',
          'autism',
          'intellectual_disability',
          'cerebral_palsy',
          'down_syndrome',
          'language_delay',
          'learning_disability',
          'physical_disability',
          'all',
        ],
      },
    ],
    ageRange: {
      min: Number,
      max: Number,
      unit: { type: String, enum: ['months', 'years'], default: 'years' },
    },

    // ── Scoring ────────────────────────────────────────────────────────
    scoringType: {
      type: String,
      enum: [
        'numeric',
        'likert',
        'binary',
        'percentage',
        'percentile',
        'standard_score',
        'age_equivalent',
        'composite',
      ],
      default: 'numeric',
    },
    maxScore: Number,
    minScore: { type: Number, default: 0 },
    scoringDirection: {
      type: String,
      enum: ['higher_better', 'lower_better'],
      default: 'higher_better',
    },
    scoringRules: [scoringRuleSchema],

    // ── Domains (أبعاد المقياس) ────────────────────────────────────
    domains: [domainDefinitionSchema],

    // ── Psychometric Properties ────────────────────────────────────────
    psychometrics: {
      reliability: { type: Number, min: 0, max: 1 },
      validity: { type: Number, min: 0, max: 1 },
      sensitivityToChange: { type: String, enum: ['low', 'moderate', 'high'] },
      mcid: Number, // Minimal Clinically Important Difference
      sem: Number, // Standard Error of Measurement
    },

    // ── Administration ─────────────────────────────────────────────────
    administrationTime: Number, // in minutes
    administeredBy: [
      {
        type: String,
        enum: [
          'speech_therapist',
          'occupational_therapist',
          'physical_therapist',
          'psychologist',
          'special_educator',
          'physician',
          'nurse',
          'social_worker',
          'any_trained',
          'parent_caregiver',
        ],
      },
    ],
    trainingRequired: { type: Boolean, default: false },
    licenseRequired: { type: Boolean, default: false },

    // ── References ─────────────────────────────────────────────────────
    publisher: String,
    referenceUrl: String,
    citation: String,
    evidenceLevel: {
      type: String,
      enum: ['level_1', 'level_2', 'level_3', 'level_4', 'level_5', 'expert_opinion'],
    },

    // ── Status & Lifecycle (W210) ──────────────────────────────────────
    // Existing enum kept for back-compat; 'preview' + 'retired' added for
    // full publish workflow: draft → preview → active → deprecated → retired.
    status: {
      type: String,
      enum: ['active', 'deprecated', 'draft', 'under_review', 'preview', 'retired'],
      default: 'active',
      index: true,
    },
    effectiveFrom: { type: Date },
    effectiveUntil: { type: Date },
    supersededBy: {
      measureCode: String,
      version: String,
    },
    reviewDueAt: { type: Date, index: true },
    isGlobal: { type: Boolean, default: true },

    // ── Purpose Taxonomy (W210) ────────────────────────────────────────
    // Why a measure exists, not just what it measures. Drives:
    //   • derivedType requirement (outcome/functional_status/risk_stratification)
    //   • inclusion in Smart Engine outcome aggregations
    //   • family-report visibility defaults
    purpose: {
      type: String,
      enum: [
        'screening',
        'diagnostic',
        'functional_status',
        'outcome',
        'risk_stratification',
        'descriptor',
      ],
      index: true,
    },

    // ── Scoring governance (W210) ──────────────────────────────────────
    // Decoupled from existing `scoringType` (kept for back-compat).
    // `derivedType` MUST be set for outcome/functional_status/risk_stratification
    // — the SCQ regression class (W206b) where missing derivedType caused
    // silent fall-back to band index.
    rawShape: {
      type: String,
      enum: ['items_array', 'single_value', 'multi_subscale', 'observation_form'],
    },
    derivedType: {
      type: String,
      enum: ['sum', 'weighted_sum', 'rasch', 'lookup_table', 'algorithm', 'none'],
    },
    derivedRange: {
      min: Number,
      max: Number,
    },
    interpretationStyle: {
      type: String,
      enum: ['band', 'tier', 'cutoff', 'continuous', 'descriptor'],
    },
    scoringAlgorithmRef: String, // 'scoring/gmfm-66.js'
    scoringEngineVersion: String, // SemVer matching algorithm module

    // ── Eligibility rules (W210) ───────────────────────────────────────
    eligibility: {
      icd10Required: [String], // ['G80.*'] — wildcard supported
      icd10Excluded: [String],
      prerequisiteMeasures: [String], // ['GMFCS'] — must be admin'd first
      conflictsWith: [String], // alternatives — don't bundle together
      certificationRequired: String, // 'GMFM-66-cert'
      minTrainingHours: Number,
      languages: [{ type: String, enum: ['ar', 'en', 'ar-ksa'] }],
      culturalAdaptation: {
        type: String,
        enum: ['not_required', 'required', 'done', 'pending'],
      },
    },

    // ── Reassessment cadence (W210) ────────────────────────────────────
    reassessment: {
      standardIntervalDays: Number,
      minIntervalDays: Number,
      maxIntervalDays: Number,
      triggerOverrides: [String], // ['post_botox','post_surgery','fall_event']
      sameRaterPreferred: { type: Boolean, default: false },
      cooldownReason: String,
    },

    // ── MCID / SDC governance (W210) ───────────────────────────────────
    // Parallel to legacy `psychometrics.mcid` (numeric only) — adds
    // mandatory source citation + status to prevent invented MCID values.
    interpretation: {
      mcid: {
        value: Number,
        type: { type: String, enum: ['absolute', 'percent', 'sd_units'] },
        status: {
          type: String,
          enum: ['established', 'provisional', 'literature_pending', 'not_applicable'],
          default: 'literature_pending',
        },
        source: String, // citation (DOI / book / consensus statement)
        ageSpecific: [
          {
            ageMin: Number,
            ageMax: Number,
            ageUnit: { type: String, enum: ['months', 'years'], default: 'years' },
            value: Number,
            _id: false,
          },
        ],
      },
      sdc: {
        value: Number,
        ci: { type: Number, default: 0.95 },
        source: String,
      },
      floorEffectThreshold: Number,
      ceilingEffectThreshold: Number,
    },

    // ── Cautions / contraindications (W210) ────────────────────────────
    cautions: {
      contraindications: [String],
      precautions: [String],
      risksDescription: String,
      risksDescription_ar: String,
      safetyChecklistRefUrl: String,
    },

    // ── Smart-engine linkage (W210) ────────────────────────────────────
    engine: {
      feedsSmartEngine: { type: Boolean, default: false, index: true },
      goalTemplateRefs: [String], // keys in assessmentRecommendationEngine GOAL_TEMPLATES
      programLibraryHints: [String], // care-plan-programs-library codes
      requiresHaikuPolish: { type: Boolean, default: false },
    },

    // ── Reporting / compliance (W210) ──────────────────────────────────
    reporting: {
      showInFamilyReport: { type: Boolean, default: false },
      familyFriendlyLabel: String,
      familyFriendlyLabel_ar: String,
      cbahiStandardRef: String, // 'CBAHI-RH-7.3'
      mohrsdRequirement: { type: Boolean, default: false },
      ministryReportField: String, // mapping to W187b aggregator field
    },

    // ── Sensitivity (W210) ─────────────────────────────────────────────
    // Aligns with intelligence/sensitivity-grade.lib.js levels.
    // Default CONFIDENTIAL (MEDIUM) — PII-touching by default.
    sensitivityLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },

    // ── Audit ──────────────────────────────────────────────────────────
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
    tags: [String],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: 'measures_library',
  }
);

// ─── Indexes ────────────────────────────────────────────────────────────────

measureSchema.index({ category: 1, status: 1 });
measureSchema.index({ name: 'text', name_ar: 'text', abbreviation: 'text' });
measureSchema.index({ targetPopulation: 1 });

// ─── Methods ────────────────────────────────────────────────────────────────

measureSchema.methods.interpretScore = function (score) {
  if (!this.scoringRules || this.scoringRules.length === 0) return null;
  const rule = this.scoringRules.find(r => score >= r.minScore && score <= r.maxScore);
  return rule || null;
};

measureSchema.methods.isApplicable = function (ageInMonths, disabilityType) {
  if (this.ageRange?.min != null && this.ageRange?.max != null) {
    const ageValue = this.ageRange.unit === 'years' ? ageInMonths / 12 : ageInMonths;
    if (ageValue < this.ageRange.min || ageValue > this.ageRange.max) return false;
  }
  if (disabilityType && this.targetPopulation?.length > 0) {
    if (!this.targetPopulation.includes('all') && !this.targetPopulation.includes(disabilityType))
      return false;
  }
  return true;
};

// ─── Statics ────────────────────────────────────────────────────────────────

measureSchema.statics.findApplicable = async function (ageInMonths, disabilityType, category) {
  const query = { status: 'active', isDeleted: { $ne: true } };
  if (category) query.category = category;
  if (disabilityType) {
    query.$or = [{ targetPopulation: 'all' }, { targetPopulation: disabilityType }];
  }

  const measures = await this.find(query).lean();
  return measures.filter(m => {
    if (m.ageRange?.min != null && m.ageRange?.max != null) {
      const ageValue = m.ageRange?.unit === 'years' ? ageInMonths / 12 : ageInMonths;
      return ageValue >= m.ageRange.min && ageValue <= m.ageRange.max;
    }
    return true;
  });
};

// ─── Wave-18 Invariants (W210 governance guards) ────────────────────────────

measureSchema.path('version').validate(function (v) {
  if (!v) return true;
  return SEMVER_RE.test(v);
}, 'version must be SemVer (e.g. 1.0.0)');

measureSchema.path('scoringEngineVersion').validate(function (v) {
  if (!v) return true;
  return SEMVER_RE.test(v);
}, 'scoringEngineVersion must be SemVer (e.g. 1.0.0)');

measureSchema.pre('validate', function () {
  // 1. Outcome-class measures MUST declare derivedType + interpretationStyle.
  //    This is the SCQ/W206b regression class — silent fall-back to band
  //    index when derivedType missing produced wrong tier assignments.
  if (this.purpose && OUTCOME_PURPOSES.has(this.purpose)) {
    if (!this.derivedType) {
      throw new Error(
        `Measure ${this.code}: derivedType required for purpose=${this.purpose} ` +
          '(silent fallback to band index is forbidden — see W206b/SCQ)'
      );
    }
    if (!this.interpretationStyle) {
      throw new Error(
        `Measure ${this.code}: interpretationStyle required for purpose=${this.purpose}`
      );
    }
  }

  // 2. MCID with a value MUST have a source citation. Prevents invented MCID.
  const mcid = this.interpretation && this.interpretation.mcid;
  if (
    mcid &&
    mcid.value != null &&
    (mcid.status === 'established' || mcid.status === 'provisional')
  ) {
    if (!mcid.source || !mcid.source.trim()) {
      throw new Error(
        `Measure ${this.code}: interpretation.mcid.source citation required when ` +
          `mcid.value is set with status=${mcid.status}`
      );
    }
  }

  // 3. ICD-10 patterns must match accepted form (e.g. G80, G80.1, G80.*).
  const ic = this.eligibility && this.eligibility.icd10Required;
  if (Array.isArray(ic) && ic.length) {
    const bad = ic.filter(s => s && !ICD10_RE.test(s));
    if (bad.length) {
      throw new Error(`Measure ${this.code}: invalid ICD-10 pattern(s): ${bad.join(', ')}`);
    }
  }

  // 4. Reassessment interval coherence.
  const r = this.reassessment;
  if (r) {
    if (
      r.minIntervalDays != null &&
      r.standardIntervalDays != null &&
      r.minIntervalDays > r.standardIntervalDays
    ) {
      throw new Error(`Measure ${this.code}: reassessment.minIntervalDays > standardIntervalDays`);
    }
    if (
      r.maxIntervalDays != null &&
      r.standardIntervalDays != null &&
      r.maxIntervalDays < r.standardIntervalDays
    ) {
      throw new Error(`Measure ${this.code}: reassessment.maxIntervalDays < standardIntervalDays`);
    }
  }

  // 5. supersededBy only meaningful when status is deprecated/retired.
  if (this.supersededBy && (this.supersededBy.measureCode || this.supersededBy.version)) {
    if (!['deprecated', 'retired'].includes(this.status)) {
      throw new Error(
        `Measure ${this.code}: supersededBy may only be set when status is deprecated/retired`
      );
    }
  }

  // 6. effectiveUntil must be after effectiveFrom.
  if (this.effectiveFrom && this.effectiveUntil && this.effectiveUntil <= this.effectiveFrom) {
    throw new Error(`Measure ${this.code}: effectiveUntil must be after effectiveFrom`);
  }
});

// ─── Audit Hook (W210) ──────────────────────────────────────────────────────
// Lazy-load MeasureRevision to avoid circular require at module init.
// Why pre+post split: isModified() must be queried BEFORE the save flushes
// modified paths. We capture the snapshot in pre and read it back in post,
// where the document write has succeeded.
const GOVERNANCE_AUDIT_PATHS = [
  'version',
  'status',
  'purpose',
  'derivedType',
  'interpretationStyle',
  'scoringAlgorithmRef',
  'scoringEngineVersion',
  'interpretation.mcid.value',
  'interpretation.mcid.status',
  'interpretation.mcid.source',
  'interpretation.sdc.value',
  'reassessment.standardIntervalDays',
  'effectiveFrom',
  'effectiveUntil',
  'supersededBy.measureCode',
  'sensitivityLevel',
];

measureSchema.pre('save', function () {
  // Capture per-save state (reset each time — don't carry across saves).
  this._w210AuditPending = !this.isNew && {
    changedPaths: GOVERNANCE_AUDIT_PATHS.filter(p => this.isModified(p)),
  };
});

measureSchema.post('save', async function (doc) {
  const pending = doc._w210AuditPending;
  doc._w210AuditPending = null;
  if (!pending || !pending.changedPaths.length) return;
  try {
    const MeasureRevision =
      mongoose.models.MeasureRevision || require('./MeasureRevision').MeasureRevision;
    if (!MeasureRevision) return;
    await MeasureRevision.create({
      measureCode: doc.code,
      toVersion: doc.version || null,
      changeType: 'edit',
      changedPaths: pending.changedPaths,
      revisedBy: doc.lastModifiedBy || null,
      revisedAt: new Date(),
    });
  } catch (_err) {
    // Audit must never break the primary write. Logged silently.
  }
});

// ─── Lifecycle methods (W210) ───────────────────────────────────────────────

measureSchema.methods.publish = async function (actorId) {
  if (!['draft', 'preview', 'under_review'].includes(this.status)) {
    throw new Error(`cannot publish from status=${this.status}`);
  }
  this.status = 'active';
  this.effectiveFrom = this.effectiveFrom || new Date();
  this.lastModifiedBy = actorId || this.lastModifiedBy;
  await this.save();
  await this._writeRevision('publish', actorId);
  return this;
};

measureSchema.methods.deprecate = async function (actorId, { supersededBy, reason } = {}) {
  if (this.status !== 'active') {
    throw new Error(`cannot deprecate from status=${this.status}`);
  }
  this.status = 'deprecated';
  this.effectiveUntil = new Date();
  if (supersededBy) this.supersededBy = supersededBy;
  this.lastModifiedBy = actorId || this.lastModifiedBy;
  await this.save();
  await this._writeRevision('deprecate', actorId, { reason });
  return this;
};

measureSchema.methods.retire = async function (actorId, { reason } = {}) {
  if (!['deprecated', 'draft'].includes(this.status)) {
    throw new Error(`cannot retire from status=${this.status} (must be deprecated or draft)`);
  }
  this.status = 'retired';
  this.lastModifiedBy = actorId || this.lastModifiedBy;
  await this.save();
  await this._writeRevision('retire', actorId, { reason });
  return this;
};

measureSchema.methods._writeRevision = async function (changeType, actorId, extra = {}) {
  try {
    const MeasureRevision =
      mongoose.models.MeasureRevision || require('./MeasureRevision').MeasureRevision;
    if (!MeasureRevision) return;
    await MeasureRevision.create({
      measureCode: this.code,
      toVersion: this.version || null,
      changeType,
      revisedBy: actorId || null,
      revisedAt: new Date(),
      changeSummary: extra.reason || null,
    });
  } catch (_err) {
    // never break primary write
  }
};

// ─── Eligibility check (W210) ───────────────────────────────────────────────
// Extends isApplicable() with prerequisiteMeasures + icd10 + certification.
measureSchema.methods.isEligibleFor = function (beneficiary, ctx = {}) {
  // 1. Age (existing logic, reused)
  if (this.ageRange?.min != null && this.ageRange?.max != null) {
    const ageMonths =
      beneficiary.ageMonths ?? (beneficiary.ageYears != null ? beneficiary.ageYears * 12 : null);
    if (ageMonths == null) return { eligible: false, reason: 'age unknown' };
    const ageValue = this.ageRange.unit === 'years' ? ageMonths / 12 : ageMonths;
    if (ageValue < this.ageRange.min || ageValue > this.ageRange.max) {
      return { eligible: false, reason: 'out_of_age_range' };
    }
  }

  // 2. ICD-10 inclusion / exclusion (W210)
  const benIcd = beneficiary.icd10 || beneficiary.diagnosis_codes || [];
  const benIcdArr = Array.isArray(benIcd) ? benIcd : [benIcd];
  const matchIcd = (pattern, code) => {
    if (!pattern || !code) return false;
    if (pattern.endsWith('.*')) {
      return code.toUpperCase().startsWith(pattern.slice(0, -2).toUpperCase());
    }
    return code.toUpperCase() === pattern.toUpperCase();
  };

  const req = this.eligibility?.icd10Required || [];
  if (req.length && !req.some(p => benIcdArr.some(c => matchIcd(p, c)))) {
    return { eligible: false, reason: 'icd10_required_not_met' };
  }
  const exc = this.eligibility?.icd10Excluded || [];
  if (exc.length && exc.some(p => benIcdArr.some(c => matchIcd(p, c)))) {
    return { eligible: false, reason: 'icd10_excluded' };
  }

  // 3. Prerequisite measures (caller passes administered measure codes)
  const adminCodes = ctx.administeredMeasureCodes || [];
  const prereq = this.eligibility?.prerequisiteMeasures || [];
  const missingPrereq = prereq.filter(p => !adminCodes.includes(p));
  if (missingPrereq.length) {
    return { eligible: false, reason: 'prerequisite_missing', missing: missingPrereq };
  }

  // 4. Certification (caller passes rater's cert codes)
  if (this.eligibility?.certificationRequired) {
    const certs = ctx.raterCertifications || [];
    if (!certs.includes(this.eligibility.certificationRequired)) {
      return {
        eligible: false,
        reason: 'certification_missing',
        required: this.eligibility.certificationRequired,
      };
    }
  }

  // 5. Status active
  if (this.status !== 'active') {
    return { eligible: false, reason: 'measure_not_active', status: this.status };
  }

  return { eligible: true };
};

// ─── Statics: governance queries (W210) ─────────────────────────────────────

measureSchema.statics.findEligibleFor = async function (beneficiary, opts = {}) {
  const filter = { status: 'active', isDeleted: { $ne: true } };
  if (opts.discipline) filter.administeredBy = opts.discipline;
  if (opts.purpose) filter.purpose = opts.purpose;
  if (opts.domain) filter.category = opts.domain;

  const candidates = await this.find(filter).lean({ virtuals: false });
  return candidates
    .map(doc => {
      // hydrate for method access
      const m = new this(doc);
      const res = m.isEligibleFor(beneficiary, opts);
      return res.eligible
        ? { measure: doc, eligible: true }
        : { measure: doc, eligible: false, ...res };
    })
    .filter(x => (opts.includeIneligible ? true : x.eligible));
};

measureSchema.statics.findDueForReview = function (now = new Date()) {
  return this.find({
    status: 'active',
    isDeleted: { $ne: true },
    reviewDueAt: { $lte: now },
  }).lean();
};

const Measure = mongoose.models.Measure || mongoose.model('Measure', measureSchema);

module.exports = { Measure, measureSchema };
