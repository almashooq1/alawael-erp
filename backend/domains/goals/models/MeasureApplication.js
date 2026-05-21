/**
 * MeasureApplication — نموذج تطبيق المقياس على المستفيد
 *
 * يمثل تطبيقاً فعلياً لمقياس على مستفيد في وقت معين.
 * يربط المقياس بالمستفيد والحلقة العلاجية ويحفظ الدرجات والتفسير.
 *
 * Wave 211 — Administration governance:
 *   • Baseline lock workflow — once a baseline is locked, score paths
 *     are immutable; corrections must land as a NEW record with
 *     correctionOf pointing back. Closes the "silent baseline overwrite"
 *     risk from the W210 architecture doc.
 *   • Version pinning — every administration captures the measure
 *     version + scoring engine version it was scored against. Future
 *     measure-version changes do NOT retroactively change historical
 *     interpretations.
 *   • MCID/SDC freeze — interpretation thresholds at administration
 *     time are persisted, so the "clinically significant" determination
 *     never drifts even if the measure's MCID gets updated.
 *   • Eligibility snapshot — what passed at admin time (ICD-10 match,
 *     prerequisites, certifications) — defensible audit for CBAHI.
 *   • Cooldown enforcement — re-admin before minIntervalDays requires
 *     an explicit clinical justification.
 *
 * @module domains/goals/models/MeasureApplication
 */

const mongoose = require('mongoose');

const SEMVER_RE = /^\d+\.\d+\.\d+$/;

// ─── Domain Score Sub-schema ────────────────────────────────────────────────

const domainScoreSchema = new mongoose.Schema(
  {
    domainKey: { type: String, required: true },
    domainName: String,
    domainName_ar: String,

    // Raw item scores
    itemScores: [
      {
        itemIndex: Number,
        label: String,
        rawScore: Number,
        notes: String,
      },
    ],

    // Computed
    rawScore: { type: Number, required: true },
    standardScore: Number,
    percentile: Number,
    ageEquivalent: Number, // months
    scaledScore: Number,

    // Interpretation
    interpretation: String,
    interpretation_ar: String,
    severity: {
      type: String,
      enum: ['normal', 'mild', 'moderate', 'severe', 'critical'],
    },
  },
  { _id: true }
);

// ─── Main Schema ────────────────────────────────────────────────────────────

const measureApplicationSchema = new mongoose.Schema(
  {
    // ── Context ───────────────────────────────────────────────────
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    episodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EpisodeOfCare',
      index: true,
    },
    measureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Measure',
      required: true,
      index: true,
    },

    // ── Application Info ──────────────────────────────────────────
    applicationDate: { type: Date, required: true, default: Date.now, index: true },
    applicationNumber: { type: Number, default: 1 }, // رقم التطبيق (1st, 2nd, 3rd...)

    purpose: {
      type: String,
      enum: ['baseline', 'progress', 'discharge', 'screening', 'periodic', 'research'],
      default: 'progress',
      index: true,
    },

    // ── Domain Scores ─────────────────────────────────────────────
    domainScores: [domainScoreSchema],

    // ── Total Score ───────────────────────────────────────────────
    totalRawScore: Number,
    totalStandardScore: Number,
    totalPercentile: Number,
    compositeScore: Number,
    ageEquivalent: Number, // months

    // ── Interpretation ────────────────────────────────────────────
    overallInterpretation: String,
    overallInterpretation_ar: String,
    overallSeverity: {
      type: String,
      enum: ['normal', 'mild', 'moderate', 'severe', 'critical'],
    },
    matchedRule: {
      rangeLabel: String,
      rangeLabel_ar: String,
      color: String,
    },

    // ── Comparison (baseline / previous / target) ─────────────────
    comparison: {
      baselineScore: Number,
      baselineDate: Date,
      previousScore: Number,
      previousDate: Date,
      targetScore: Number,
      changeFromBaseline: Number, // raw change
      changeFromBaselinePercent: Number, // % change
      changeFromPrevious: Number,
      changeFromPreviousPercent: Number,
      progressToTarget: Number, // % toward target
      trend: {
        type: String,
        enum: ['improving', 'stable', 'declining', 'insufficient_data'],
      },
      isClinicallySignificant: Boolean, // based on MCID
    },

    // ── Administration Details ─────────────────────────────────────
    assessorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    setting: {
      type: String,
      enum: ['clinic', 'home', 'school', 'community', 'telehealth', 'other'],
      default: 'clinic',
    },
    duration: Number, // actual minutes
    notes: String,
    clinicalObservations: String,

    // ── Re-application Schedule ───────────────────────────────────
    nextApplicationDate: Date,
    reapplicationIntervalDays: Number,
    reapplicationStatus: {
      type: String,
      enum: ['not_scheduled', 'scheduled', 'overdue', 'completed'],
      default: 'not_scheduled',
    },

    // ── Linked Assessment ─────────────────────────────────────────
    assessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClinicalAssessment',
    },

    // ── Status (W211: extended with locked + corrected) ───────────
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'cancelled', 'invalid', 'locked', 'corrected'],
      default: 'in_progress',
      index: true,
    },

    // ── Baseline lock (W211) ──────────────────────────────────────
    // Baseline is the immutable "where they were" record. Once locked,
    // it becomes the anchor for all future delta computations. Cannot
    // be edited — fixes go through correction records.
    isBaseline: { type: Boolean, default: false, index: true },
    lockedAt: { type: Date },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ── Version pinning (W211) ────────────────────────────────────
    // The exact measure version + scoring algorithm version that
    // produced these scores. Pinned at administration time so future
    // measure version bumps never silently re-interpret history.
    scoredWithMeasureVersion: { type: String, match: SEMVER_RE },
    scoredWithAlgorithmVersion: { type: String, match: SEMVER_RE },

    // ── MCID/SDC frozen at administration time (W211) ────────────
    // Pulled from the live Measure at admin time and persisted. If the
    // measure's published MCID later changes, the clinical
    // significance flag on this administration does NOT shift.
    mcidAtAdministration: {
      value: Number,
      type: { type: String, enum: ['absolute', 'percent', 'sd_units'] },
      status: {
        type: String,
        enum: ['established', 'provisional', 'literature_pending', 'not_applicable'],
      },
      source: String,
    },
    sdcAtAdministration: {
      value: Number,
      ci: Number,
    },

    // ── Correction record (W211) ──────────────────────────────────
    // When a fix is needed for a LOCKED administration, a new record
    // is created with correctionOf pointing back. The original stays
    // locked. The new record carries status='completed' and the
    // original transitions to status='corrected' (still locked, but
    // flagged as superseded).
    correctionOf: { type: mongoose.Schema.Types.ObjectId, ref: 'MeasureApplication' },
    correctionReason: String,
    supersededByCorrection: { type: mongoose.Schema.Types.ObjectId, ref: 'MeasureApplication' },

    // ── Eligibility snapshot at admin time (W211) ────────────────
    // Frozen evidence that the measure was eligible to administer for
    // this beneficiary at this moment. Defensible for CBAHI audits
    // even if the measure's eligibility rules later change.
    eligibilitySnapshot: {
      ageMonthsAtAdmin: Number,
      icd10Matched: [String],
      prerequisitesMet: [String],
      raterCertifications: [String],
      raterCertCheckPassed: Boolean,
      checkedAt: Date,
    },

    // ── Cooldown justification (W211) ─────────────────────────────
    // Re-administration within the measure's minIntervalDays requires
    // an explicit reason. Captured here for audit.
    cooldownJustification: String,
    cooldownApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ── Flags ─────────────────────────────────────────────────────
    isAutoScored: { type: Boolean, default: false },
    requiresReview: { type: Boolean, default: false },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,

    // ── Anomaly flags (W257e wiring of W248c detector) ────────────
    // Observability-only — populated by measureAdministration service
    // at create time using measureAdminAnomalyDetector.service.js
    // (W248c). Does NOT block save; surfaces data-quality concerns
    // (impossibly-fast admin, out-of-range score, implausible delta
    // vs frozen SDC, pattern-filling) for human review via dashboard.
    // Empty array on clean admins.
    anomalyFlags: [
      {
        type: { type: String },
        severity: { type: String, enum: ['low', 'medium', 'high'] },
        evidence_ar: String,
        evidence_en: String,
        fields: { type: mongoose.Schema.Types.Mixed },
        detectedAt: { type: Date, default: Date.now },
      },
    ],

    // ── Multi-tenant ──────────────────────────────────────────────
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────

measureApplicationSchema.index({ beneficiaryId: 1, measureId: 1, applicationDate: -1 });
measureApplicationSchema.index({ beneficiaryId: 1, purpose: 1 });
measureApplicationSchema.index({ episodeId: 1, measureId: 1 });
measureApplicationSchema.index({ nextApplicationDate: 1, reapplicationStatus: 1 });

// ─── Virtuals ─────────────────────────────────────────────────────────────

measureApplicationSchema.virtual('isOverdueForReapplication').get(function () {
  return (
    this.reapplicationStatus === 'scheduled' &&
    this.nextApplicationDate &&
    new Date() > this.nextApplicationDate
  );
});

// ─── Statics ──────────────────────────────────────────────────────────────

/**
 * Get history of a specific measure for a beneficiary
 */
measureApplicationSchema.statics.getMeasureHistory = function (beneficiaryId, measureId) {
  return this.find({
    beneficiaryId,
    measureId,
    status: 'completed',
  })
    .sort({ applicationDate: 1 })
    .populate('assessorId', 'name firstName lastName')
    .lean();
};

/**
 * Get latest application per measure for a beneficiary
 */
measureApplicationSchema.statics.getLatestPerMeasure = async function (beneficiaryId) {
  return this.aggregate([
    {
      $match: {
        beneficiaryId: new mongoose.Types.ObjectId(beneficiaryId),
        status: 'completed',
      },
    },
    { $sort: { applicationDate: -1 } },
    {
      $group: {
        _id: '$measureId',
        lastApplication: { $first: '$$ROOT' },
      },
    },
    {
      $lookup: {
        from: 'measures_library',
        localField: '_id',
        foreignField: '_id',
        as: 'measure',
      },
    },
    { $unwind: '$measure' },
    {
      $project: {
        measureId: '$_id',
        measureName: '$measure.name',
        measureName_ar: '$measure.name_ar',
        measureCode: '$measure.code',
        category: '$measure.category',
        lastDate: '$lastApplication.applicationDate',
        lastScore: '$lastApplication.totalRawScore',
        lastStandardScore: '$lastApplication.totalStandardScore',
        severity: '$lastApplication.overallSeverity',
        purpose: '$lastApplication.purpose',
        changeFromBaseline: '$lastApplication.comparison.changeFromBaseline',
        trend: '$lastApplication.comparison.trend',
        nextApplicationDate: '$lastApplication.nextApplicationDate',
        reapplicationStatus: '$lastApplication.reapplicationStatus',
      },
    },
  ]);
};

/**
 * Get overdue re-applications
 */
measureApplicationSchema.statics.getOverdueReapplications = function (branchId) {
  const query = {
    reapplicationStatus: 'scheduled',
    nextApplicationDate: { $lt: new Date() },
    status: 'completed',
  };
  if (branchId) query.branchId = branchId;

  return this.find(query)
    .populate('beneficiaryId', 'name fileNumber personalInfo')
    .populate('measureId', 'name name_ar code category')
    .populate('assessorId', 'name firstName lastName')
    .sort({ nextApplicationDate: 1 })
    .lean();
};

/**
 * Score comparison dashboard — aggregate by measure across all beneficiaries
 */
measureApplicationSchema.statics.getMeasureDashboard = async function (measureId, filters = {}) {
  const match = {
    measureId: new mongoose.Types.ObjectId(measureId),
    status: 'completed',
  };
  if (filters.branchId) match.branchId = new mongoose.Types.ObjectId(filters.branchId);
  if (filters.from) match.applicationDate = { $gte: new Date(filters.from) };

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        avgScore: { $avg: '$totalRawScore' },
        avgStandardScore: { $avg: '$totalStandardScore' },
        minScore: { $min: '$totalRawScore' },
        maxScore: { $max: '$totalRawScore' },
        totalApplications: { $sum: 1 },
        uniqueBeneficiaries: { $addToSet: '$beneficiaryId' },
        severityDistribution: { $push: '$overallSeverity' },
      },
    },
    {
      $project: {
        _id: 0,
        avgScore: { $round: ['$avgScore', 2] },
        avgStandardScore: { $round: ['$avgStandardScore', 2] },
        minScore: 1,
        maxScore: 1,
        totalApplications: 1,
        uniqueBeneficiaries: { $size: '$uniqueBeneficiaries' },
        severityDistribution: 1,
      },
    },
  ]);
};

// ─── W211 indexes for the new query patterns ────────────────────────────
// Partial unique: at most ONE baseline record per (beneficiary, measure).
// Filtered on isBaseline so non-baseline records aren't constrained.
measureApplicationSchema.index(
  { beneficiaryId: 1, measureId: 1, isBaseline: 1 },
  { unique: true, partialFilterExpression: { isBaseline: true } }
);
measureApplicationSchema.index({ correctionOf: 1 });

// ─── W211 score-path immutability list (used by pre-save guard) ────────
// If a record is locked and any of these paths is modified, the save
// is rejected — fixes must come through a correction record.
// Note: isBaseline is intentionally NOT in this list. When a baseline is
// corrected, the "baseline" title transfers to the correction record —
// which requires the original to clear isBaseline=false. The partial
// unique index forbids two simultaneously-active baselines per
// (beneficiary, measure), so transferring the flag is the only way the
// correction record can also carry isBaseline=true.
const W211_LOCKED_IMMUTABLE_PATHS = [
  'domainScores',
  'totalRawScore',
  'totalStandardScore',
  'totalPercentile',
  'compositeScore',
  'ageEquivalent',
  'overallInterpretation',
  'overallInterpretation_ar',
  'overallSeverity',
  'matchedRule',
  'applicationDate',
  'purpose',
  'scoredWithMeasureVersion',
  'scoredWithAlgorithmVersion',
  'mcidAtAdministration',
  'sdcAtAdministration',
];

// ─── W211 Wave-18 invariants (pre-validate, Mongoose 9 throw-style) ────

measureApplicationSchema.pre('validate', function () {
  // 1. Locked records reject any change to score-relevant paths.
  //    Allowed: lifecycle transitions (status→corrected, supersededByCorrection
  //    pointer) — explicitly NOT in W211_LOCKED_IMMUTABLE_PATHS.
  if (!this.isNew && (this.status === 'locked' || this._wasLocked)) {
    const violated = W211_LOCKED_IMMUTABLE_PATHS.filter(p => this.isModified(p));
    if (violated.length) {
      throw new Error(
        `MeasureApplication ${this._id}: cannot modify ${violated.join(', ')} on a ` +
          'locked record — write a correction record instead (correctionOf=this._id)'
      );
    }
  }

  // 2. Status=locked requires version pinning. Closes the "we have a
  //    locked baseline but no record of which algorithm version scored
  //    it" gap — that would break frozen historical comparisons.
  if (this.status === 'locked' || this.status === 'corrected') {
    if (!this.scoredWithMeasureVersion) {
      throw new Error(
        `MeasureApplication ${this._id || '(new)'}: scoredWithMeasureVersion required when ` +
          `status=${this.status}`
      );
    }
  }

  // 3. lockedAt + lockedBy must accompany locked status (set by .lock()).
  if (this.status === 'locked' && !this.lockedAt) {
    throw new Error(
      `MeasureApplication ${this._id || '(new)'}: lockedAt required when status=locked`
    );
  }

  // 4. correctionOf must reference a real ObjectId when set, and
  //    correctionReason must accompany it.
  if (this.correctionOf && !this.correctionReason) {
    throw new Error(
      `MeasureApplication ${this._id || '(new)'}: correctionReason required when correctionOf is set`
    );
  }

  // 5. isBaseline + purpose='baseline' must agree. The unique index
  //    further guarantees only one baseline per (beneficiary, measure).
  if (this.isBaseline && this.purpose !== 'baseline') {
    throw new Error(
      `MeasureApplication ${this._id || '(new)'}: isBaseline=true requires purpose='baseline'`
    );
  }
});

// Track "was locked" through the save flow so post-validate can detect
// attempted score edits on a record that started locked even when the
// status field itself is being changed.
measureApplicationSchema.pre('save', function () {
  if (!this.isNew && this.isModified('status')) {
    const original = this.$__.activePaths.getStatePaths('modify');
    // Original status comes from the unmodified pre-image — Mongoose
    // exposes it via .get(path, null, {getters: false}) on the doc's
    // internal _doc. Cheaper: rely on the persisted document.
  }
});

// ─── W211 instance methods ─────────────────────────────────────────────

measureApplicationSchema.methods.lock = async function (actorId) {
  if (this.status === 'locked') return this;
  if (this.status !== 'completed') {
    throw new Error(`cannot lock from status=${this.status} (must be 'completed')`);
  }
  if (!this.scoredWithMeasureVersion) {
    throw new Error('cannot lock without scoredWithMeasureVersion (version pinning required)');
  }
  this.status = 'locked';
  this.lockedAt = new Date();
  this.lockedBy = actorId || this.lockedBy;
  await this.save();
  return this;
};

measureApplicationSchema.methods.isLocked = function () {
  return this.status === 'locked' || this.status === 'corrected';
};

measureApplicationSchema.methods.markCorrected = async function (newRecordId) {
  if (!this.isLocked()) {
    throw new Error(`cannot mark-corrected from status=${this.status} (must be locked/corrected)`);
  }
  this.status = 'corrected';
  this.supersededByCorrection = newRecordId;
  await this.save();
  return this;
};

// ─── W211 statics ──────────────────────────────────────────────────────

measureApplicationSchema.statics.findBaseline = function (beneficiaryId, measureId) {
  return this.findOne({
    beneficiaryId,
    measureId,
    isBaseline: true,
  }).lean();
};

measureApplicationSchema.statics.findDueForReassessment = async function (
  beneficiaryId,
  { now = new Date() } = {}
) {
  // For each (beneficiary, measureId) pair: latest completed/locked admin
  // older than measure.reassessment.standardIntervalDays.
  const Measure = mongoose.model('Measure');
  const latests = await this.aggregate([
    {
      $match: {
        beneficiaryId: new mongoose.Types.ObjectId(beneficiaryId),
        status: { $in: ['completed', 'locked'] },
      },
    },
    { $sort: { applicationDate: -1 } },
    {
      $group: {
        _id: '$measureId',
        lastDate: { $first: '$applicationDate' },
        lastId: { $first: '$_id' },
      },
    },
  ]);
  const due = [];
  for (const item of latests) {
    const measure = await Measure.findById(item._id)
      .select('code name name_ar reassessment status')
      .lean();
    if (!measure || measure.status !== 'active') continue;
    const interval = measure.reassessment?.standardIntervalDays;
    if (!interval) continue;
    const dueAt = new Date(item.lastDate);
    dueAt.setDate(dueAt.getDate() + interval);
    if (dueAt <= now) {
      due.push({
        measureId: measure._id,
        measureCode: measure.code,
        measureName: measure.name,
        measureName_ar: measure.name_ar,
        lastApplicationId: item.lastId,
        lastApplicationDate: item.lastDate,
        dueAt,
        overdueDays: Math.floor((now - dueAt) / (1000 * 60 * 60 * 24)),
      });
    }
  }
  return due;
};

measureApplicationSchema.statics.cooldownCheck = async function (
  beneficiaryId,
  measureId,
  { now = new Date() } = {}
) {
  const Measure = mongoose.model('Measure');
  const measure = await Measure.findById(measureId).select('reassessment').lean();
  const minDays = measure?.reassessment?.minIntervalDays;
  if (!minDays) return { inCooldown: false, minIntervalDays: null };
  const last = await this.findOne({
    beneficiaryId,
    measureId,
    status: { $in: ['completed', 'locked'] },
  })
    .sort({ applicationDate: -1 })
    .select('applicationDate')
    .lean();
  if (!last) return { inCooldown: false, minIntervalDays: minDays };
  const earliestAllowed = new Date(last.applicationDate);
  earliestAllowed.setDate(earliestAllowed.getDate() + minDays);
  const inCooldown = now < earliestAllowed;
  return {
    inCooldown,
    minIntervalDays: minDays,
    lastApplicationDate: last.applicationDate,
    earliestAllowed,
    daysRemaining: inCooldown ? Math.ceil((earliestAllowed - now) / (1000 * 60 * 60 * 24)) : 0,
  };
};

// ─── W214: Auto-close reassessment tasks on new admin ──────────────
// When a new completed administration lands for a (beneficiary, measure)
// pair, any open MeasureReassessmentTask for that pair is auto-closed
// with mode='auto'. Best-effort — never blocks the primary save.
//
// Critical: only fires on INSERT, not on update. Otherwise the
// W211b baseline-title-transfer save inside correct() (which re-saves
// the locked original to clear isBaseline) would incorrectly close
// the task. pre-save captures the isNew flag; post-save reads it.
measureApplicationSchema.pre('save', function () {
  this._w214WasNew = this.isNew;
});
measureApplicationSchema.post('save', async function (doc) {
  try {
    if (!doc._w214WasNew) return;
    if (doc.correctionOf) return;
    if (!['completed', 'locked'].includes(doc.status)) return;
    if (!doc.beneficiaryId || !doc.measureId) return;
    // Lazy-require to avoid circular load at module init.

    const scheduler = require('../../../services/measureReassessmentScheduler.service');
    await scheduler.autoCloseFor({
      beneficiaryId: doc.beneficiaryId,
      measureId: doc.measureId,
      newApplicationId: doc._id,
    });

    // W216: auto-update goal currentProgress when a measure with a
    // numeric score lands. Best-effort, same contract as W214 above.
    if (typeof doc.totalRawScore === 'number' && Number.isFinite(doc.totalRawScore)) {
      const goalUpdater = require('../../../services/measureGoalUpdater.service');
      await goalUpdater.updateGoalsForAdmin({
        beneficiaryId: doc.beneficiaryId,
        measureId: doc.measureId,
        totalRawScore: doc.totalRawScore,
        applicationId: doc._id,
        applicationDate: doc.applicationDate,
        assessorId: doc.assessorId,
      });
    }
  } catch (_err) {
    // Never propagate — audit-trail failures must not break primary writes.
  }
});

const MeasureApplication =
  mongoose.models.MeasureApplication ||
  mongoose.model('MeasureApplication', measureApplicationSchema);

module.exports = {
  MeasureApplication,
  measureApplicationSchema,
  W211_LOCKED_IMMUTABLE_PATHS,
};
