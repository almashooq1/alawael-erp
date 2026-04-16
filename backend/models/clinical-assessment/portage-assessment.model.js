'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Sub-schema ───────────────────────────────────────────────────────────────

const portageItemSchema = new Schema(
  {
    domain: {
      type: String,
      enum: ['infant_stimulation', 'socialization', 'language', 'self_help', 'cognitive', 'motor'],
      required: true,
    },
    age_range: { type: String, required: true }, // "0-1", "1-2", "2-3", "3-4", "4-5", "5-6"
    item_number: { type: Number, required: true },
    skill_ar: { type: String, required: true },
    skill_en: { type: String },
    achieved: { type: Boolean, default: false },
    emerging: { type: Boolean, default: false }, // ناشئة (يحاول لكن لم يتقن)
    attempted_date: { type: Date },
    mastery_date: { type: Date },
    teaching_strategy_ar: { type: String }, // إرشادات التدريب
    notes: { type: String },
  },
  { _id: false }
);

// ─── Main Schema ──────────────────────────────────────────────────────────────

const PortageAssessmentSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    assessor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    assessment_date: { type: Date, default: Date.now },
    age_months: { type: Number, required: true, min: 0, max: 72 }, // 0-6 years

    items: [portageItemSchema],

    // ── ملخص المجالات
    domain_summaries: {
      infant_stimulation: {
        total_items: Number,
        achieved: Number,
        emerging: Number,
        percentage: Number,
        age_equivalent_months: Number,
        delay_months: Number,
      },
      socialization: {
        total_items: Number,
        achieved: Number,
        emerging: Number,
        percentage: Number,
        age_equivalent_months: Number,
        delay_months: Number,
      },
      language: {
        total_items: Number,
        achieved: Number,
        emerging: Number,
        percentage: Number,
        age_equivalent_months: Number,
        delay_months: Number,
      },
      self_help: {
        total_items: Number,
        achieved: Number,
        emerging: Number,
        percentage: Number,
        age_equivalent_months: Number,
        delay_months: Number,
      },
      cognitive: {
        total_items: Number,
        achieved: Number,
        emerging: Number,
        percentage: Number,
        age_equivalent_months: Number,
        delay_months: Number,
      },
      motor: {
        total_items: Number,
        achieved: Number,
        emerging: Number,
        percentage: Number,
        age_equivalent_months: Number,
        delay_months: Number,
      },
    },

    // ── تحليل النمو
    developmental_analysis: {
      overall_developmental_age_months: Number,
      overall_delay_months: Number,
      delay_percentage: Number,
      delay_severity: {
        type: String,
        enum: ['no_delay', 'mild', 'moderate', 'severe', 'profound'],
      },
      strongest_domain: String,
      weakest_domain: String,
      priority_goals: [String],
      recommended_programs: [String],
    },

    status: {
      type: String,
      enum: ['draft', 'in_progress', 'completed', 'reviewed'],
      default: 'draft',
    },
    notes: { type: String },
  },
  { timestamps: true, collection: 'portage_assessments' }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

PortageAssessmentSchema.index({ beneficiary: 1, assessment_date: -1 });
PortageAssessmentSchema.index({ branch: 1, status: 1, createdAt: -1 });

// ─── Static Methods ───────────────────────────────────────────────────────────

PortageAssessmentSchema.statics.paginate = async function (filter = {}, options = {}) {
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

PortageAssessmentSchema.statics.latestFor = function (beneficiaryId) {
  return this.findOne({ beneficiary: beneficiaryId, status: { $ne: 'deleted' } })
    .sort({ createdAt: -1 })
    .populate('assessor', 'name role')
    .lean();
};

// ─── Export ───────────────────────────────────────────────────────────────────

const PortageAssessment =
  mongoose.models.PortageAssessment || mongoose.model('PortageAssessment', PortageAssessmentSchema);

module.exports = PortageAssessment;
