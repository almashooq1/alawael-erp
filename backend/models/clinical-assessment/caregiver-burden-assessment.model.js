'use strict';

/**
 * Caregiver Burden Scale — مقياس عبء مقدم الرعاية
 * معدّل عن Zarit Burden Interview (22 بند)
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const CaregiverBurdenSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    caregiver_name: { type: String, required: true },
    caregiver_relationship: {
      type: String,
      enum: [
        'mother',
        'father',
        'spouse',
        'sibling',
        'grandparent',
        'other_relative',
        'professional_caregiver',
      ],
      required: true,
    },
    assessor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    assessment_date: { type: Date, default: Date.now },

    // ── بنود المقياس (22 بند - مقياس زاريت المعدل)
    items: [
      {
        item_number: { type: Number, required: true },
        question_ar: { type: String, required: true },
        dimension: {
          type: String,
          enum: ['personal_strain', 'role_strain', 'guilt', 'impact_on_health', 'financial_impact'],
        },
        score: {
          type: Number,
          required: true,
          enum: [0, 1, 2, 3, 4], // 0=أبداً, 1=نادراً, 2=أحياناً, 3=غالباً, 4=دائماً تقريباً
        },
      },
    ],

    // ── الدرجات
    dimension_scores: {
      personal_strain: { score: Number, max: Number, percentage: Number },
      role_strain: { score: Number, max: Number, percentage: Number },
      guilt: { score: Number, max: Number, percentage: Number },
      impact_on_health: { score: Number, max: Number, percentage: Number },
      financial_impact: { score: Number, max: Number, percentage: Number },
    },

    total_score: { type: Number, min: 0, max: 88 },

    // 0-20: عبء قليل أو معدوم, 21-40: خفيف-متوسط, 41-60: متوسط-شديد, 61-88: شديد
    burden_level: {
      type: String,
      enum: ['little_or_no', 'mild_moderate', 'moderate_severe', 'severe'],
    },
    burden_level_ar: String,

    // ── توصيات الدعم
    support_recommendations: {
      respite_care: { needed: Boolean, recommended_hours_weekly: Number },
      counseling: { needed: Boolean, type: String },
      support_group: { needed: Boolean },
      training: { needed: Boolean, topics: [String] },
      financial_assistance: { needed: Boolean },
      home_modification: { needed: Boolean },
      medical_referral: { needed: Boolean, specialty: String },
    },

    comparison_with_previous: {
      previous_id: Schema.Types.ObjectId,
      previous_score: Number,
      change: Number,
      trend: { type: String, enum: ['improved', 'stable', 'worsened'] },
    },

    status: { type: String, enum: ['draft', 'completed', 'reviewed'], default: 'draft' },
    notes: { type: String },
  },
  { timestamps: true, collection: 'caregiver_burden_assessments' }
);

CaregiverBurdenSchema.index({ beneficiary: 1, assessment_date: -1 });
CaregiverBurdenSchema.index({ branch: 1, status: 1, createdAt: -1 });

CaregiverBurdenSchema.pre('save', function (next) {
  if (typeof this.total_score === 'number' && !this.burden_level) {
    const s = this.total_score;
    if (s <= 20) {
      this.burden_level = 'little_or_no';
      this.burden_level_ar = 'عبء قليل أو معدوم';
    } else if (s <= 40) {
      this.burden_level = 'mild_moderate';
      this.burden_level_ar = 'عبء خفيف إلى متوسط';
    } else if (s <= 60) {
      this.burden_level = 'moderate_severe';
      this.burden_level_ar = 'عبء متوسط إلى شديد';
    } else {
      this.burden_level = 'severe';
      this.burden_level_ar = 'عبء شديد';
    }
  }
  next();
});

CaregiverBurdenSchema.virtual('burden_summary').get(function () {
  return `${this.burden_level_ar || this.burden_level} (${this.total_score}/88)`;
});

CaregiverBurdenSchema.set('toJSON', { virtuals: true });
CaregiverBurdenSchema.set('toObject', { virtuals: true });

CaregiverBurdenSchema.statics.paginate = async function (filter = {}, options = {}) {
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

CaregiverBurdenSchema.statics.latestFor = function (beneficiaryId) {
  return this.findOne({ beneficiary: beneficiaryId, status: { $ne: 'deleted' } })
    .sort({ createdAt: -1 })
    .populate('assessor', 'name role')
    .lean();
};

const CaregiverBurdenAssessment =
  mongoose.models.CaregiverBurdenAssessment ||
  mongoose.model('CaregiverBurdenAssessment', CaregiverBurdenSchema);

module.exports = CaregiverBurdenAssessment;
