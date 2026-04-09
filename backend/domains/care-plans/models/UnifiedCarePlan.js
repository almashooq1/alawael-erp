/**
 * UnifiedCarePlan Model — خطة الرعاية الموحدة
 *
 * خطة علاجية شاملة مرتبطة بالمستفيد والحلقة العلاجية.
 * تدعم: تعليمية، علاجية، مهارات حياتية، سلوكية، متعددة التخصصات.
 *
 * @module domains/care-plans/models/UnifiedCarePlan
 */

const mongoose = require('mongoose');

const goalRefSchema = new mongoose.Schema(
  {
    goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'TherapeuticGoal' },
    title: String,
    type: {
      type: String,
      enum: [
        'academic',
        'behavioral',
        'communication',
        'motor',
        'speech',
        'social',
        'life_skill',
        'cognitive',
        'sensory',
        'vocational',
        'other',
      ],
    },
    baseline: String,
    target: String,
    criteria: String,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'achieved', 'discontinued', 'modified'],
      default: 'pending',
    },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    notes: String,
  },
  { _id: true }
);

const interventionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    title_ar: String,
    description: String,
    domain: {
      type: String,
      enum: [
        'speech_therapy',
        'occupational_therapy',
        'physical_therapy',
        'behavioral_therapy',
        'psychological',
        'educational',
        'social_work',
        'nursing',
        'vocational',
        'recreational',
        'assistive_technology',
        'family_training',
        'other',
      ],
    },
    frequency: String,
    duration: String,
    responsibleId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    responsibleRole: String,
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ['planned', 'active', 'paused', 'completed', 'cancelled'],
      default: 'planned',
    },
    evidence: String,
    notes: String,
  },
  { _id: true }
);

const sectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    name_ar: String,
    specialistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    specialistRole: String,
    assessments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ClinicalAssessment' }],
    goals: [goalRefSchema],
    interventions: [interventionSchema],
    frequency: String,
    notes: String,
  },
  { _id: true }
);

const reviewSchema = new mongoose.Schema(
  {
    reviewDate: { type: Date, required: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewType: {
      type: String,
      enum: ['periodic', 'progress', 'modification', 'mdt', 'discharge'],
    },
    findings: String,
    modifications: [String],
    nextReviewDate: Date,
    decision: {
      type: String,
      enum: ['continue', 'modify', 'intensify', 'reduce', 'discharge'],
    },
    attendees: [{ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, role: String }],
  },
  { _id: true }
);

const unifiedCarePlanSchema = new mongoose.Schema(
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

    // ── Identity ───────────────────────────────────────────────────────
    planNumber: { type: String, unique: true, sparse: true },
    title: String,
    title_ar: String,

    // ── Type & Status ──────────────────────────────────────────────────
    type: {
      type: String,
      enum: ['comprehensive', 'focused', 'iep', 'irp', 'crisis', 'maintenance', 'transition'],
      default: 'comprehensive',
    },
    status: {
      type: String,
      enum: [
        'draft',
        'pending_approval',
        'active',
        'under_review',
        'modified',
        'completed',
        'archived',
      ],
      default: 'draft',
      index: true,
    },

    // ── Timeline ───────────────────────────────────────────────────────
    startDate: { type: Date, required: true },
    endDate: Date,
    reviewDate: Date,
    nextReviewDate: Date,
    reviewCycle: {
      type: String,
      enum: ['weekly', 'biweekly', 'monthly', 'quarterly', 'custom'],
      default: 'monthly',
    },

    // ── Plan Domains (أقسام الخطة) ─────────────────────────────────
    educational: {
      domains: {
        academic: sectionSchema,
        classroom: sectionSchema,
        communication: sectionSchema,
      },
    },
    therapeutic: {
      domains: {
        speech: sectionSchema,
        occupational: sectionSchema,
        physical: sectionSchema,
        behavioral: sectionSchema,
        psychological: sectionSchema,
      },
    },
    lifeSkills: {
      domains: {
        selfCare: sectionSchema,
        homeSkills: sectionSchema,
        social: sectionSchema,
        transport: sectionSchema,
        financial: sectionSchema,
        vocational: sectionSchema,
      },
    },

    // ── Global Goals (أهداف شاملة) ─────────────────────────────────
    globalGoals: [goalRefSchema],

    // ── Global Interventions ────────────────────────────────────────
    globalInterventions: [interventionSchema],

    // ── Family Component ────────────────────────────────────────────
    familyComponent: {
      homeProgram: String,
      parentTraining: [String],
      familyGoals: [String],
      communicationPlan: String,
      nextFamilyMeeting: Date,
    },

    // ── Reviews ─────────────────────────────────────────────────────
    reviews: [reviewSchema],

    // ── Approval Workflow ────────────────────────────────────────────
    approvals: [
      {
        role: String,
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
        date: Date,
        comments: String,
      },
    ],
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,

    // ── Version Control ─────────────────────────────────────────────
    version: { type: Number, default: 1 },
    previousVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'UnifiedCarePlan' },

    // ── Multi-Tenancy & Audit ───────────────────────────────────────
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
    collection: 'unified_care_plans',
  }
);

// ─── Indexes ────────────────────────────────────────────────────────────────

unifiedCarePlanSchema.index({ beneficiaryId: 1, status: 1 });
unifiedCarePlanSchema.index({ episodeId: 1, status: 1 });
unifiedCarePlanSchema.index({ status: 1, reviewDate: 1 });
unifiedCarePlanSchema.index({ nextReviewDate: 1, status: 1 });
unifiedCarePlanSchema.index({ createdAt: -1 });

// ─── Virtuals ───────────────────────────────────────────────────────────────

unifiedCarePlanSchema.virtual('overallProgress').get(function () {
  const allGoals = [...(this.globalGoals || [])];
  // Collect goals from all sections
  const gatherSection = domainGroup => {
    if (!domainGroup?.domains) return;
    Object.values(domainGroup.domains).forEach(section => {
      if (section?.goals) allGoals.push(...section.goals);
    });
  };
  gatherSection(this.educational);
  gatherSection(this.therapeutic);
  gatherSection(this.lifeSkills);

  if (allGoals.length === 0) return 0;
  const totalProgress = allGoals.reduce((sum, g) => sum + (g.progress || 0), 0);
  return Math.round(totalProgress / allGoals.length);
});

unifiedCarePlanSchema.virtual('isOverdueForReview').get(function () {
  if (!this.nextReviewDate) return false;
  return new Date() > new Date(this.nextReviewDate);
});

unifiedCarePlanSchema.virtual('daysUntilReview').get(function () {
  if (!this.nextReviewDate) return null;
  const diff = new Date(this.nextReviewDate) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// ─── Pre-save ───────────────────────────────────────────────────────────────

unifiedCarePlanSchema.pre('save', function (next) {
  if (!this.planNumber && this.isNew) {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.planNumber = `CP-${dateStr}-${random}`;
  }
  next();
});

// ─── Static Methods ─────────────────────────────────────────────────────────

unifiedCarePlanSchema.statics.getActiveForEpisode = function (episodeId) {
  return this.findOne({ episodeId, status: 'active', isDeleted: { $ne: true } });
};

unifiedCarePlanSchema.statics.getOverdueReviews = function (branchId) {
  const match = {
    isDeleted: { $ne: true },
    status: { $in: ['active', 'under_review'] },
    nextReviewDate: { $lt: new Date() },
  };
  if (branchId) match.branchId = new mongoose.Types.ObjectId(branchId);

  return this.find(match)
    .populate('beneficiaryId', 'firstName lastName fullNameArabic mrn')
    .sort({ nextReviewDate: 1 })
    .lean({ virtuals: true });
};

const UnifiedCarePlan =
  mongoose.models.UnifiedCarePlan || mongoose.model('UnifiedCarePlan', unifiedCarePlanSchema);

module.exports = { UnifiedCarePlan, unifiedCarePlanSchema };
