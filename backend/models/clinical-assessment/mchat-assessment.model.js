'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Sub-schema ───────────────────────────────────────────────────────────────

const mchatItemSchema = new Schema(
  {
    item_number: { type: Number, required: true, min: 1, max: 20 },
    question_ar: { type: String, required: true },
    question_en: { type: String },
    response: { type: Boolean, required: true }, // true=نعم, false=لا
    is_critical: { type: Boolean, default: false }, // البنود الحرجة (2,5,9,12,15,17,18,21)
    is_at_risk: { type: Boolean }, // هل الإجابة تشير لخطر؟
    followup_completed: { type: Boolean, default: false },
    followup_passed: { type: Boolean }, // اجتاز المتابعة؟
  },
  { _id: false }
);

// ─── Main Schema ──────────────────────────────────────────────────────────────

const MChatAssessmentSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    assessor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    assessment_date: { type: Date, default: Date.now },
    age_months: { type: Number, required: true, min: 16, max: 30 },
    informant: { type: String, enum: ['mother', 'father', 'caregiver'], default: 'mother' },

    // ── البنود الـ 20
    items: {
      type: [mchatItemSchema],
      validate: { validator: v => v.length === 20, message: 'يجب الإجابة على جميع البنود الـ 20' },
    },

    // ── التسجيل
    total_risk_score: { type: Number, min: 0, max: 20 },
    critical_items_failed: { type: Number, min: 0, max: 8 },

    // ── مستوى الخطر
    risk_level: {
      type: String,
      enum: ['low', 'medium', 'high'],
      // low: 0-2, medium: 3-7, high: 8-20
    },
    risk_level_ar: { type: String },

    // ── المتابعة Follow-Up Interview (R/F)
    followup_completed: { type: Boolean, default: false },
    followup_score: { type: Number, min: 0, max: 20 },
    followup_risk_level: { type: String, enum: ['low', 'medium', 'high'] },

    // ── التوصيات التلقائية
    auto_recommendations: {
      referral_needed: { type: Boolean },
      referral_type: {
        type: String,
        enum: ['none', 'developmental_eval', 'autism_eval', 'early_intervention', 'comprehensive'],
      },
      urgency: { type: String, enum: ['routine', 'priority', 'urgent'] },
      suggested_assessments: [String],
      family_guidance_ar: { type: String },
    },

    status: {
      type: String,
      enum: ['draft', 'completed', 'reviewed', 'referred'],
      default: 'draft',
    },
    notes: { type: String },
  },
  { timestamps: true, collection: 'mchat_assessments' }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

MChatAssessmentSchema.index({ beneficiary: 1, assessment_date: -1 });
MChatAssessmentSchema.index({ risk_level: 1, status: 1 });
MChatAssessmentSchema.index({ branch: 1, status: 1, createdAt: -1 });
MChatAssessmentSchema.index({ notes: 'text' });

// ─── Pre-save Hook ────────────────────────────────────────────────────────────

MChatAssessmentSchema.pre('save', function (next) {
  if (typeof this.total_risk_score === 'number' && !this.risk_level) {
    if (this.total_risk_score <= 2) this.risk_level = 'low';
    else if (this.total_risk_score <= 7) this.risk_level = 'medium';
    else this.risk_level = 'high';
  }
  if (this.risk_level === 'low') this.risk_level_ar = 'منخفض';
  else if (this.risk_level === 'medium') this.risk_level_ar = 'متوسط';
  else if (this.risk_level === 'high') this.risk_level_ar = 'مرتفع';
  next();
});

// ─── Virtuals ─────────────────────────────────────────────────────────────────

MChatAssessmentSchema.virtual('risk_summary').get(function () {
  return `${this.risk_level_ar || this.risk_level} (${this.total_risk_score}/20, ${this.critical_items_failed} بنود حرجة)`;
});

MChatAssessmentSchema.set('toJSON', { virtuals: true });
MChatAssessmentSchema.set('toObject', { virtuals: true });

// ─── Static Methods ───────────────────────────────────────────────────────────

MChatAssessmentSchema.statics.paginate = async function (filter = {}, options = {}) {
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

MChatAssessmentSchema.statics.latestFor = function (beneficiaryId) {
  return this.findOne({ beneficiary: beneficiaryId, status: { $ne: 'deleted' } })
    .sort({ createdAt: -1 })
    .populate('assessor', 'name role')
    .lean();
};

// ─── Export ───────────────────────────────────────────────────────────────────

const MChatAssessment =
  mongoose.models.MChatAssessment || mongoose.model('MChatAssessment', MChatAssessmentSchema);

module.exports = MChatAssessment;
