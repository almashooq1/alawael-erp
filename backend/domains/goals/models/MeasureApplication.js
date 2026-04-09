/**
 * MeasureApplication — نموذج تطبيق المقياس على المستفيد
 *
 * يمثل تطبيقاً فعلياً لمقياس على مستفيد في وقت معين.
 * يربط المقياس بالمستفيد والحلقة العلاجية ويحفظ الدرجات والتفسير.
 *
 * يدعم:
 *  - إدخال درجات حسب الأبعاد (domains)
 *  - التصحيح الآلي
 *  - مقارنة baseline / current / target
 *  - جداول إعادة التطبيق
 *
 * @module domains/goals/models/MeasureApplication
 */

const mongoose = require('mongoose');

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

    // ── Status ────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'cancelled', 'invalid'],
      default: 'in_progress',
      index: true,
    },

    // ── Flags ─────────────────────────────────────────────────────
    isAutoScored: { type: Boolean, default: false },
    requiresReview: { type: Boolean, default: false },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,

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

const MeasureApplication =
  mongoose.models.MeasureApplication ||
  mongoose.model('MeasureApplication', measureApplicationSchema);

module.exports = { MeasureApplication, measureApplicationSchema };
