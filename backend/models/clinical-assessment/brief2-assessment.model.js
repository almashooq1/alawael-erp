'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Sub-schema ───────────────────────────────────────────────────────────────

const briefItemSchema = new Schema(
  {
    item_number: { type: Number, required: true },
    scale: {
      type: String,
      enum: [
        'inhibit', // تثبيط
        'self_monitor', // مراقبة ذاتية
        'shift', // مرونة
        'emotional_control', // تحكم انفعالي
        'initiate', // مبادرة
        'working_memory', // ذاكرة عاملة
        'plan_organize', // تخطيط/تنظيم
        'task_monitor', // مراقبة المهام
        'organization_materials', // تنظيم المواد
      ],
    },
    question_ar: { type: String, required: true },
    question_en: { type: String },
    response: {
      type: Number,
      required: true,
      enum: [1, 2, 3], // 1=أبداً, 2=أحياناً, 3=دائماً
    },
  },
  { _id: false }
);

// ─── Main Schema ──────────────────────────────────────────────────────────────

const BRIEFAssessmentSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    assessor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    assessment_date: { type: Date, default: Date.now },
    age_months: { type: Number, required: true, min: 60, max: 216 }, // 5-18y
    respondent: { type: String, enum: ['parent', 'teacher', 'self'], default: 'parent' },
    form_type: { type: String, enum: ['parent', 'teacher', 'self_report'], default: 'parent' },

    items: [briefItemSchema],

    // ── درجات السلالم الفرعية Scale Scores
    scale_scores: {
      inhibit: { raw: Number, t_score: Number, percentile: Number },
      self_monitor: { raw: Number, t_score: Number, percentile: Number },
      shift: { raw: Number, t_score: Number, percentile: Number },
      emotional_control: { raw: Number, t_score: Number, percentile: Number },
      initiate: { raw: Number, t_score: Number, percentile: Number },
      working_memory: { raw: Number, t_score: Number, percentile: Number },
      plan_organize: { raw: Number, t_score: Number, percentile: Number },
      task_monitor: { raw: Number, t_score: Number, percentile: Number },
      organization_materials: { raw: Number, t_score: Number, percentile: Number },
    },

    // ── المؤشرات المركبة Composite Indexes
    composite_scores: {
      // مؤشر التنظيم السلوكي BRI
      behavioral_regulation_index: { t_score: Number, percentile: Number, classification: String },
      // مؤشر التنظيم الانفعالي ERI
      emotion_regulation_index: { t_score: Number, percentile: Number, classification: String },
      // مؤشر التنظيم المعرفي CRI
      cognitive_regulation_index: { t_score: Number, percentile: Number, classification: String },
      // المؤشر التنفيذي الكلي GEC
      global_executive_composite: { t_score: Number, percentile: Number, classification: String },
    },

    // ── تصنيف الأداء
    // T-Score: < 60 = طبيعي، 60-64 = مرتفع قليلاً، 65-69 = مرتفع سريرياً، ≥ 70 = مرتفع جداً
    clinical_interpretation: {
      primary_concerns: [String],
      strengths: [String],
      intervention_recommendations: [String],
    },

    validity_indicators: {
      negativity: { score: Number, classification: String },
      inconsistency: { score: Number, classification: String },
      infrequency: { score: Number, classification: String },
      is_valid: { type: Boolean, default: true },
    },

    status: { type: String, enum: ['draft', 'completed', 'reviewed'], default: 'draft' },
    notes: { type: String },
  },
  { timestamps: true, collection: 'brief2_assessments' }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

BRIEFAssessmentSchema.index({ beneficiary: 1, assessment_date: -1 });
BRIEFAssessmentSchema.index({ branch: 1, status: 1, createdAt: -1 });

// ─── Static Methods ───────────────────────────────────────────────────────────

BRIEFAssessmentSchema.statics.paginate = async function (filter = {}, options = {}) {
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

BRIEFAssessmentSchema.statics.latestFor = function (beneficiaryId) {
  return this.findOne({ beneficiary: beneficiaryId, status: { $ne: 'deleted' } })
    .sort({ createdAt: -1 })
    .populate('assessor', 'name role')
    .lean();
};

// ─── Export ───────────────────────────────────────────────────────────────────

const BRIEF2Assessment =
  mongoose.models.BRIEF2Assessment || mongoose.model('BRIEF2Assessment', BRIEFAssessmentSchema);

module.exports = BRIEF2Assessment;
