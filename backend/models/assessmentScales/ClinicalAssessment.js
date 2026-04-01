/**
 * ClinicalAssessment.js — التقييمات السريرية الفعلية
 * Clinical Assessment Sessions
 *
 * يمثل تطبيق فعلي لمقياس معين على مستفيد معين
 * يختلف عن Assessment.js (ProgramAssessment) الذي يقيّم البرامج
 */

'use strict';

const mongoose = require('mongoose');

const clinicalAssessmentSchema = new mongoose.Schema(
  {
    // ── رقم التقييم التلقائي ─────────────────────────────────
    assessment_number: {
      type: String,
      unique: true,
      sparse: true,
      // ASMT-2026-00001
    },

    // ── الروابط الأساسية ─────────────────────────────────────
    beneficiary_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: [true, 'المستفيد مطلوب'],
      index: true,
    },
    tool_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssessmentTool',
      required: [true, 'المقياس مطلوب'],
      index: true,
    },
    assessor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'الأخصائي المُقيِّم مطلوب'],
      index: true,
    },
    branch_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      index: true,
    },
    plan_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RehabPlan',
      default: null, // ربط اختياري بخطة تأهيلية
    },

    // ── نوع التقييم ──────────────────────────────────────────
    assessment_type: {
      type: String,
      required: [true, 'نوع التقييم مطلوب'],
      enum: [
        'initial', // تقييم أولي (عند القبول)
        'periodic', // دوري (كل 3-6 أشهر)
        're_evaluation', // إعادة تقييم
        'discharge', // عند الخروج/التخرج
        'screening', // مسح وغربلة
        'follow_up', // متابعة
      ],
      index: true,
    },
    referral_reason: { type: String, trim: true }, // سبب الإحالة

    // ── معلومات الجلسة ────────────────────────────────────────
    assessment_date: {
      type: Date,
      required: [true, 'تاريخ التقييم مطلوب'],
      index: true,
    },
    start_time: { type: String }, // HH:MM
    end_time: { type: String }, // HH:MM
    duration_minutes: { type: Number, min: 0 },
    location: { type: String, trim: true }, // مكان التطبيق

    // ── معلومات المُستجيب (للاستبيانات) ─────────────────────
    respondent_name: { type: String, trim: true },
    respondent_type: {
      type: String,
      enum: ['parent', 'teacher', 'caregiver', 'self', 'clinician'],
      default: null,
    },
    respondent_relationship: { type: String, trim: true },

    // ── النتائج الإجمالية ─────────────────────────────────────
    total_raw_score: { type: Number, default: null },
    total_standard_score: { type: Number, default: null },
    total_percentile: { type: Number, default: null, min: 0, max: 100 },
    total_age_equivalent: { type: String, trim: true }, // "3 سنوات و 6 أشهر"
    overall_classification: { type: String, trim: true }, // "متوسط"، "تحت المتوسط" ...
    overall_severity: { type: String, trim: true }, // "خفيف"، "معتدل"، "شديد"

    // ── الملاحظات السريرية ────────────────────────────────────
    behavioral_observations: { type: String, trim: true }, // ملاحظات سلوكية
    clinical_interpretation_ar: { type: String, trim: true }, // التفسير السريري
    clinical_interpretation_en: { type: String, trim: true },
    strengths_ar: { type: String, trim: true }, // نقاط القوة
    weaknesses_ar: { type: String, trim: true }, // نقاط الضعف / التحديات
    recommendations_ar: { type: String, trim: true }, // التوصيات
    recommendations_en: { type: String, trim: true },

    // ── حالة التقييم ─────────────────────────────────────────
    status: {
      type: String,
      enum: [
        'draft', // مسودة (لم يكتمل)
        'in_progress', // قيد التطبيق
        'scoring', // قيد حساب الدرجات
        'completed', // مكتمل
        'reviewed', // تمت المراجعة
        'approved', // معتمد
        'cancelled', // ملغي
      ],
      default: 'draft',
      index: true,
    },
    completion_percentage: { type: Number, default: 0, min: 0, max: 100 },
    last_autosave_at: { type: Date, default: null },

    // ── المراجعة والاعتماد ───────────────────────────────────
    reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewed_at: { type: Date, default: null },
    review_notes: { type: String, trim: true },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approved_at: { type: Date, default: null },

    // ── المقارنة مع تقييم سابق ───────────────────────────────
    previous_assessment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClinicalAssessment',
      default: null,
    },
    comparison_summary: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      /*
        {
          previous_date: "2025-06-01",
          days_between: 180,
          total_score_change: 7.5,
          overall_direction: "improved",
          domain_changes: [
            { domain_name: "التواصل", previous: 75, current: 82, change: 7, direction: "improved" },
            ...
          ],
          improvements_count: 3, declines_count: 0, maintained_count: 1
        }
      */
    },

    // ── المرفقات ──────────────────────────────────────────────
    attachments: {
      type: [
        {
          name: String,
          file_path: String,
          file_type: String,
          uploaded_at: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },

    // ── الإنشاء والتعديل ──────────────────────────────────────
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // ── الحذف الناعم ──────────────────────────────────────────
    is_deleted: { type: Boolean, default: false, index: true },
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: 'clinical_assessments',
  }
);

// ── الفهارس ─────────────────────────────────────────────────────
clinicalAssessmentSchema.index({ beneficiary_id: 1, tool_id: 1 });
clinicalAssessmentSchema.index({ assessor_id: 1, assessment_date: -1 });
clinicalAssessmentSchema.index({ status: 1, assessment_date: -1 });
clinicalAssessmentSchema.index({ assessment_type: 1 });
clinicalAssessmentSchema.index({ branch_id: 1, assessment_date: -1 });

// ── Pre-save: توليد رقم التقييم ────────────────────────────────
clinicalAssessmentSchema.pre('save', async function (next) {
  if (this.isNew && !this.assessment_number) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31`),
      },
    });
    this.assessment_number = `ASMT-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// ── Virtuals ────────────────────────────────────────────────────
clinicalAssessmentSchema.virtual('is_complete').get(function () {
  return ['completed', 'reviewed', 'approved'].includes(this.status);
});

clinicalAssessmentSchema.virtual('overall_direction').get(function () {
  return this.comparison_summary?.overall_direction || null;
});

// ── Methods ─────────────────────────────────────────────────────

/**
 * حساب نسبة الإكمال
 */
clinicalAssessmentSchema.methods.recalculateCompletion = async function (
  totalRequiredItems,
  answeredItems
) {
  if (!totalRequiredItems) return 0;
  const pct = Math.min(100, Math.round((answeredItems / totalRequiredItems) * 100));
  this.completion_percentage = pct;
  this.last_autosave_at = new Date();
  return pct;
};

// ── Statics ─────────────────────────────────────────────────────

/**
 * آخر تقييم مكتمل لمستفيد بمقياس معين
 */
clinicalAssessmentSchema.statics.findPreviousCompleted = function (
  beneficiaryId,
  toolId,
  excludeId = null
) {
  const filter = {
    beneficiary_id: beneficiaryId,
    tool_id: toolId,
    status: { $in: ['completed', 'approved'] },
    is_deleted: { $ne: true },
  };
  if (excludeId) filter._id = { $ne: excludeId };
  return this.findOne(filter).sort({ assessment_date: -1 });
};

/**
 * إحصائيات شاملة
 */
clinicalAssessmentSchema.statics.getStats = async function (filters = {}) {
  const match = { is_deleted: { $ne: true }, ...filters };
  const [statusStats, typeStats, toolStats] = await Promise.all([
    this.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    this.aggregate([
      { $match: match },
      { $group: { _id: '$assessment_type', count: { $sum: 1 } } },
    ]),
    this.aggregate([
      { $match: { ...match, status: { $in: ['completed', 'approved'] } } },
      { $group: { _id: '$tool_id', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const byStatus = {};
  statusStats.forEach(s => {
    byStatus[s._id] = s.count;
  });

  const byType = {};
  typeStats.forEach(t => {
    byType[t._id] = t.count;
  });

  return {
    by_status: byStatus,
    by_type: byType,
    top_tools: toolStats,
    total: Object.values(byStatus).reduce((a, b) => a + b, 0),
  };
};

/**
 * خط زمني مستفيد (مجمّع حسب المقياس)
 */
clinicalAssessmentSchema.statics.getBeneficiaryTimeline = async function (beneficiaryId) {
  return this.aggregate([
    {
      $match: {
        beneficiary_id: new mongoose.Types.ObjectId(beneficiaryId),
        status: { $in: ['completed', 'approved'] },
        is_deleted: { $ne: true },
      },
    },
    { $sort: { assessment_date: 1 } },
    {
      $group: {
        _id: '$tool_id',
        assessments: {
          $push: {
            id: '$_id',
            date: '$assessment_date',
            total_standard_score: '$total_standard_score',
            total_raw_score: '$total_raw_score',
            classification: '$overall_classification',
            assessment_type: '$assessment_type',
          },
        },
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'assessment_tools',
        localField: '_id',
        foreignField: '_id',
        as: 'tool',
      },
    },
    { $unwind: '$tool' },
    {
      $project: {
        tool_id: '$_id',
        tool_name_ar: '$tool.name_ar',
        tool_abbreviation: '$tool.abbreviation',
        tool_category: '$tool.category',
        assessments: 1,
        count: 1,
      },
    },
  ]);
};

module.exports =
  mongoose.models.ClinicalAssessment ||
  mongoose.model('ClinicalAssessment', clinicalAssessmentSchema);
