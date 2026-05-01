/**
 * ClinicalAssessment Model — نموذج التقييم السريري الموحد
 *
 * تقييم موحد مرتبط بالمستفيد والحلقة العلاجية.
 * يدعم: تقييمات أولية، دورية، ختامية، متخصصة، ICF.
 *
 * @module domains/assessments/models/ClinicalAssessment
 */

const mongoose = require('mongoose');

const domainScoreSchema = new mongoose.Schema(
  {
    domain: {
      type: String,
      enum: [
        'motor_gross',
        'motor_fine',
        'speech_language',
        'communication',
        'cognitive',
        'social_emotional',
        'behavioral',
        'sensory',
        'daily_living',
        'academic',
        'vocational',
        'self_care',
        'mobility',
        'play',
        'feeding',
        'custom',
      ],
      required: true,
    },
    label: String,
    label_ar: String,
    score: { type: Number, required: true },
    maxScore: Number,
    percentile: Number,
    standardScore: Number,
    ageEquivalent: String,
    interpretation: {
      type: String,
      enum: [
        'significantly_below',
        'below_average',
        'average',
        'above_average',
        'significantly_above',
      ],
    },
    notes: String,
  },
  { _id: true }
);

const clinicalObservationSchema = new mongoose.Schema(
  {
    attention: { type: String, enum: ['poor', 'fair', 'good', 'excellent'] },
    motivation: { type: String, enum: ['low', 'moderate', 'high'] },
    cooperation: { type: String, enum: ['poor', 'fair', 'good', 'excellent'] },
    fatigue: { type: String, enum: ['none', 'mild', 'moderate', 'severe'] },
    emotionalState: {
      type: String,
      enum: ['calm', 'anxious', 'upset', 'happy', 'withdrawn', 'agitated'],
    },
    communicationMode: { type: String, enum: ['verbal', 'non_verbal', 'augmentative', 'mixed'] },
    environmentNotes: String,
    behavioralNotes: String,
    additionalNotes: String,
  },
  { _id: false }
);

const goalAlignmentSchema = new mongoose.Schema(
  {
    goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'TherapeuticGoal' },
    goalTitle: String,
    baselineValue: Number,
    currentValue: Number,
    targetValue: Number,
    gapPercentage: Number,
    status: {
      type: String,
      enum: ['below_baseline', 'at_baseline', 'progressing', 'near_target', 'achieved', 'exceeded'],
    },
  },
  { _id: false }
);

const clinicalAssessmentSchema = new mongoose.Schema(
  {
    // ── Core Links ─────────────────────────────────────────────────────
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    episodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EpisodeOfCare',
      required: true,
      index: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClinicalSession',
    },

    // ── Assessment Identity ────────────────────────────────────────────
    assessmentNumber: { type: String, unique: true, sparse: true },
    type: {
      type: String,
      enum: [
        'initial',
        'periodic',
        'reassessment',
        'discharge',
        'specialized',
        'screening',
        'comprehensive',
        'progress',
        'icf',
        'functional',
        'behavioral',
        'educational',
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'in_progress', 'pending_review', 'approved', 'archived'],
      default: 'draft',
      index: true,
    },

    // ── Assessment Date ────────────────────────────────────────────────
    assessmentDate: { type: Date, required: true, default: Date.now },
    scheduledDate: Date,
    completedDate: Date,
    dueDate: Date,

    // ── Assessor ───────────────────────────────────────────────────────
    assessorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assessorRole: String,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    reviewNotes: String,

    // ── Measure Used ───────────────────────────────────────────────────
    measureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Measure',
    },
    measureName: String,
    measureVersion: String,

    // ── Scores ─────────────────────────────────────────────────────────
    totalScore: Number,
    maxPossibleScore: Number,
    percentageScore: Number,
    domainScores: [domainScoreSchema],

    // ── Trend Data ─────────────────────────────────────────────────────
    previousScore: Number,
    scoreChange: Number,
    changePercentage: Number,
    trend: {
      direction: { type: String, enum: ['improving', 'stable', 'declining'] },
      slope: Number,
      rSquared: Number,
      predictedNext: Number,
      consecutiveImprovement: { type: Number, default: 0 },
      consecutiveDecline: { type: Number, default: 0 },
    },

    // ── Statistical ────────────────────────────────────────────────────
    weightedScore: Number,
    zScore: Number,
    percentileRank: Number,
    confidenceInterval: { lower: Number, upper: Number },
    standardError: Number,

    // ── Clinical Observations ──────────────────────────────────────────
    clinicalObservations: clinicalObservationSchema,

    // ── Goal Alignment ─────────────────────────────────────────────────
    goalAlignment: [goalAlignmentSchema],

    // ── ICF Profile ────────────────────────────────────────────────────
    icfProfile: {
      bodyFunctions: [{ code: String, qualifier: Number, description: String }],
      bodyStructures: [{ code: String, qualifier: Number, description: String }],
      activitiesParticipation: [
        { code: String, performance: Number, capacity: Number, description: String },
      ],
      environmentalFactors: [
        { code: String, qualifier: Number, isBarrier: Boolean, description: String },
      ],
    },

    // ── Findings & Recommendations ─────────────────────────────────────
    findings: String,
    findings_ar: String,
    strengths: [String],
    challenges: [String],
    recommendations: [String],
    recommendations_ar: [String],
    referrals: [
      {
        to: String,
        reason: String,
        priority: { type: String, enum: ['routine', 'urgent'] },
      },
    ],

    // ── Attachments ────────────────────────────────────────────────────
    attachments: [
      {
        title: String,
        fileUrl: String,
        fileType: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // ── Multi-Tenancy & Audit ──────────────────────────────────────────
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },

    tags: [String],
    notes: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: 'clinical_assessments',
  }
);

// ─── Indexes ────────────────────────────────────────────────────────────────

clinicalAssessmentSchema.index({ beneficiaryId: 1, assessmentDate: -1 });
clinicalAssessmentSchema.index({ episodeId: 1, type: 1 });
clinicalAssessmentSchema.index({ assessorId: 1, assessmentDate: -1 });
clinicalAssessmentSchema.index({ beneficiaryId: 1, type: 1, assessmentDate: -1 });
clinicalAssessmentSchema.index({ dueDate: 1, status: 1 });

// ─── Virtuals ───────────────────────────────────────────────────────────────

clinicalAssessmentSchema.virtual('improvementPercentage').get(function () {
  if (!this.previousScore || this.previousScore === 0) return null;
  return Math.round(((this.totalScore - this.previousScore) / this.previousScore) * 100);
});

clinicalAssessmentSchema.virtual('goalAchievementRate').get(function () {
  if (!this.goalAlignment || this.goalAlignment.length === 0) return 0;
  const achieved = this.goalAlignment.filter(
    g => g.status === 'achieved' || g.status === 'exceeded'
  ).length;
  return Math.round((achieved / this.goalAlignment.length) * 100);
});

clinicalAssessmentSchema.virtual('strongestDomain').get(function () {
  if (!this.domainScores || this.domainScores.length === 0) return null;
  return this.domainScores.reduce((max, d) =>
    d.score / (d.maxScore || 1) > max.score / (max.maxScore || 1) ? d : max
  );
});

clinicalAssessmentSchema.virtual('weakestDomain').get(function () {
  if (!this.domainScores || this.domainScores.length === 0) return null;
  return this.domainScores.reduce((min, d) =>
    d.score / (d.maxScore || 1) < min.score / (min.maxScore || 1) ? d : min
  );
});

// ─── Pre-save ───────────────────────────────────────────────────────────────

clinicalAssessmentSchema.pre('save', function (next) {
  // Auto-generate assessment number
  if (!this.assessmentNumber && this.isNew) {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.assessmentNumber = `ASM-${dateStr}-${random}`;
  }

  // Calculate percentage score
  if (this.totalScore != null && this.maxPossibleScore) {
    this.percentageScore = Math.round((this.totalScore / this.maxPossibleScore) * 100);
  }

  // Calculate score change
  if (this.totalScore != null && this.previousScore != null) {
    this.scoreChange = this.totalScore - this.previousScore;
    this.changePercentage =
      this.previousScore !== 0 ? Math.round((this.scoreChange / this.previousScore) * 100) : null;
  }

  // Determine trend direction
  if (this.scoreChange != null) {
    if (!this.trend) this.trend = {};
    if (this.scoreChange > 0) {
      this.trend.direction = 'improving';
    } else if (this.scoreChange < 0) {
      this.trend.direction = 'declining';
    } else {
      this.trend.direction = 'stable';
    }
  }

  next();
});

// ─── Static Methods ─────────────────────────────────────────────────────────

clinicalAssessmentSchema.statics.getTrendForBeneficiary = async function (
  beneficiaryId,
  episodeId,
  { limit = 10 } = {}
) {
  const match = {
    beneficiaryId: new mongoose.Types.ObjectId(beneficiaryId),
    isDeleted: { $ne: true },
  };
  if (episodeId) match.episodeId = new mongoose.Types.ObjectId(episodeId);

  const assessments = await this.find(match)
    .sort({ assessmentDate: -1 })
    .limit(limit)
    .select('totalScore percentageScore assessmentDate type domainScores trend')
    .lean();

  return assessments.reverse(); // chronological order
};

clinicalAssessmentSchema.statics.getOverdueAssessments = async function (branchId) {
  const match = {
    isDeleted: { $ne: true },
    status: { $in: ['draft', 'in_progress'] },
    dueDate: { $lt: new Date() },
  };
  if (branchId) match.branchId = new mongoose.Types.ObjectId(branchId);

  return this.find(match)
    .populate('beneficiaryId', 'firstName lastName fullNameArabic mrn')
    .populate('assessorId', 'firstName lastName')
    .sort({ dueDate: 1 })
    .lean();
};

// ─── Export ──────────────────────────────────────────────────────────────────

const ClinicalAssessment =
  mongoose.models.ClinicalAssessment ||
  mongoose.model('ClinicalAssessment', clinicalAssessmentSchema);

module.exports = { ClinicalAssessment, clinicalAssessmentSchema };
