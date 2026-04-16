'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Sub-schema ───────────────────────────────────────────────────────────────

const sensoryItemSchema = new Schema(
  {
    item_number: { type: Number, required: true },
    section: {
      type: String,
      enum: [
        'auditory',
        'visual',
        'touch',
        'movement',
        'body_position',
        'oral',
        'behavioral',
        'social_emotional',
      ],
      required: true,
    },
    question_ar: { type: String, required: true },
    question_en: { type: String },
    frequency: {
      type: Number,
      required: true,
      enum: [1, 2, 3, 4, 5], // 1=دائماً تقريباً, 2=كثيراً, 3=أحياناً, 4=نادراً, 5=أبداً تقريباً
    },
    quadrant: {
      type: String,
      enum: ['seeking', 'avoiding', 'sensitivity', 'registration'],
    },
  },
  { _id: false }
);

// ─── Main Schema ──────────────────────────────────────────────────────────────

const SensoryProfileSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    assessor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    assessment_date: { type: Date, default: Date.now },
    age_months: { type: Number, required: true, min: 36, max: 168 }, // 3-14y
    respondent: { type: String, enum: ['parent', 'teacher', 'caregiver'], default: 'parent' },
    form_type: { type: String, enum: ['child', 'short', 'school_companion'], default: 'child' },

    items: [sensoryItemSchema],

    // ── درجات الأقسام الحسية Section Scores
    section_scores: {
      auditory: { raw: Number, classification: String },
      visual: { raw: Number, classification: String },
      touch: { raw: Number, classification: String },
      movement: { raw: Number, classification: String },
      body_position: { raw: Number, classification: String },
      oral: { raw: Number, classification: String },
      behavioral: { raw: Number, classification: String },
      social_emotional: { raw: Number, classification: String },
    },

    // ── درجات الأرباع الحسية Quadrant Scores (Dunn's Model)
    quadrant_scores: {
      seeking: {
        raw_score: Number,
        classification: {
          type: String,
          enum: ['much_less', 'less', 'just_like', 'more', 'much_more'],
        },
        classification_ar: String,
        percentile: Number,
      },
      avoiding: {
        raw_score: Number,
        classification: {
          type: String,
          enum: ['much_less', 'less', 'just_like', 'more', 'much_more'],
        },
        classification_ar: String,
        percentile: Number,
      },
      sensitivity: {
        raw_score: Number,
        classification: {
          type: String,
          enum: ['much_less', 'less', 'just_like', 'more', 'much_more'],
        },
        classification_ar: String,
        percentile: Number,
      },
      registration: {
        raw_score: Number,
        classification: {
          type: String,
          enum: ['much_less', 'less', 'just_like', 'more', 'much_more'],
        },
        classification_ar: String,
        percentile: Number,
      },
    },

    // ── الملف الحسي الكلي
    sensory_profile_summary: {
      dominant_quadrant: String,
      dominant_quadrant_ar: String,
      sensory_pattern_description_ar: String,
      environmental_modifications: [String],
      therapy_recommendations: [String],
      classroom_strategies: [String],
      home_strategies: [String],
    },

    status: { type: String, enum: ['draft', 'completed', 'reviewed'], default: 'draft' },
    notes: { type: String },
  },
  { timestamps: true, collection: 'sensory_profile_assessments' }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

SensoryProfileSchema.index({ beneficiary: 1, assessment_date: -1 });
SensoryProfileSchema.index({ branch: 1, status: 1, createdAt: -1 });

// ─── Static Methods ───────────────────────────────────────────────────────────

SensoryProfileSchema.statics.paginate = async function (filter = {}, options = {}) {
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

SensoryProfileSchema.statics.latestFor = function (beneficiaryId) {
  return this.findOne({ beneficiary: beneficiaryId, status: { $ne: 'deleted' } })
    .sort({ createdAt: -1 })
    .populate('assessor', 'name role')
    .lean();
};

// ─── Export ───────────────────────────────────────────────────────────────────

const SensoryProfileAssessment =
  mongoose.models.SensoryProfileAssessment ||
  mongoose.model('SensoryProfileAssessment', SensoryProfileSchema);

module.exports = SensoryProfileAssessment;
