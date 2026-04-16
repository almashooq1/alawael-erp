'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Main Schema ──────────────────────────────────────────────────────────────

const TransitionReadinessSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    assessor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    assessment_date: { type: Date, default: Date.now },
    transition_type: {
      type: String,
      enum: ['school', 'community', 'vocational', 'independent_living', 'mainstream_education'],
      required: true,
    },

    // ── 8 مجالات للجاهزية
    domains: {
      self_care: {
        skills: [{ skill_ar: String, level: { type: Number, min: 1, max: 5 }, notes: String }],
        score: Number,
        max_score: Number,
        percentage: Number,
        readiness: {
          type: String,
          enum: ['not_ready', 'developing', 'approaching', 'ready', 'exceeds'],
        },
      },
      communication: {
        skills: [{ skill_ar: String, level: { type: Number, min: 1, max: 5 }, notes: String }],
        score: Number,
        max_score: Number,
        percentage: Number,
        readiness: {
          type: String,
          enum: ['not_ready', 'developing', 'approaching', 'ready', 'exceeds'],
        },
      },
      social_skills: {
        skills: [{ skill_ar: String, level: { type: Number, min: 1, max: 5 }, notes: String }],
        score: Number,
        max_score: Number,
        percentage: Number,
        readiness: {
          type: String,
          enum: ['not_ready', 'developing', 'approaching', 'ready', 'exceeds'],
        },
      },
      academic_cognitive: {
        skills: [{ skill_ar: String, level: { type: Number, min: 1, max: 5 }, notes: String }],
        score: Number,
        max_score: Number,
        percentage: Number,
        readiness: {
          type: String,
          enum: ['not_ready', 'developing', 'approaching', 'ready', 'exceeds'],
        },
      },
      behavioral: {
        skills: [{ skill_ar: String, level: { type: Number, min: 1, max: 5 }, notes: String }],
        score: Number,
        max_score: Number,
        percentage: Number,
        readiness: {
          type: String,
          enum: ['not_ready', 'developing', 'approaching', 'ready', 'exceeds'],
        },
      },
      mobility_safety: {
        skills: [{ skill_ar: String, level: { type: Number, min: 1, max: 5 }, notes: String }],
        score: Number,
        max_score: Number,
        percentage: Number,
        readiness: {
          type: String,
          enum: ['not_ready', 'developing', 'approaching', 'ready', 'exceeds'],
        },
      },
      family_support: {
        skills: [{ skill_ar: String, level: { type: Number, min: 1, max: 5 }, notes: String }],
        score: Number,
        max_score: Number,
        percentage: Number,
        readiness: {
          type: String,
          enum: ['not_ready', 'developing', 'approaching', 'ready', 'exceeds'],
        },
      },
      environmental_readiness: {
        skills: [{ skill_ar: String, level: { type: Number, min: 1, max: 5 }, notes: String }],
        score: Number,
        max_score: Number,
        percentage: Number,
        readiness: {
          type: String,
          enum: ['not_ready', 'developing', 'approaching', 'ready', 'exceeds'],
        },
      },
    },

    overall_readiness: {
      total_score: Number,
      max_score: Number,
      percentage: Number,
      level: { type: String, enum: ['not_ready', 'developing', 'approaching', 'ready', 'exceeds'] },
      level_ar: String,
      estimated_readiness_date: Date,
    },

    transition_plan: {
      target_setting: String,
      target_date: Date,
      prerequisite_goals: [{ goal_ar: String, current_status: String, target_date: Date }],
      support_services_needed: [String],
      accommodations_needed: [String],
      responsible_team: [{ name: String, role: String }],
    },

    status: {
      type: String,
      enum: ['draft', 'completed', 'plan_created', 'in_transition', 'transitioned'],
      default: 'draft',
    },
    notes: { type: String },
  },
  { timestamps: true, collection: 'transition_readiness_assessments' }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

TransitionReadinessSchema.index({ beneficiary: 1, transition_type: 1 });
TransitionReadinessSchema.index({ branch: 1, status: 1, createdAt: -1 });

// ─── Static Methods ───────────────────────────────────────────────────────────

TransitionReadinessSchema.statics.paginate = async function (filter = {}, options = {}) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const skip = (page - 1) * limit;
  const sort = options.sort || { createdAt: -1 };
  const [docs, total] = await Promise.all([
    this.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    this.countDocuments(filter),
  ]);
  return {
    docs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
};

TransitionReadinessSchema.statics.latestFor = function (beneficiaryId) {
  return this.findOne({ beneficiary: beneficiaryId, status: { $ne: 'deleted' } })
    .sort({ createdAt: -1 })
    .populate('assessor', 'name role')
    .lean();
};

// ─── Export ───────────────────────────────────────────────────────────────────

const TransitionReadinessAssessment =
  mongoose.models.TransitionReadinessAssessment ||
  mongoose.model('TransitionReadinessAssessment', TransitionReadinessSchema);

module.exports = TransitionReadinessAssessment;
