/**
 * AssessmentTool.js — مكتبة أدوات التقييم المعتمدة
 * Standardized Assessment Tools Library
 *
 * يشمل: Vineland-3, CARS-2, GARS-3, VB-MAPP, ABLLS-R,
 *        PEP-3, Stanford-Binet 5, WISC-V, Conners-3,
 *        GMFM-88, BOT-2, CELF-5, PLS-5, Bayley-4, BASC-3,
 *        GFTA-3, AFLS وغيرها
 */

'use strict';

const mongoose = require('mongoose');

const assessmentToolSchema = new mongoose.Schema(
  {
    // ── الرمز والتعريف ─────────────────────────────────────────
    code: {
      type: String,
      required: [true, 'رمز المقياس مطلوب'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 30,
      // VINELAND3, CARS2, VBMAPP, GARS3, ABLLS_R ...
    },
    name_ar: { type: String, required: [true, 'الاسم العربي مطلوب'], trim: true },
    name_en: { type: String, required: [true, 'الاسم الإنجليزي مطلوب'], trim: true },
    abbreviation: {
      type: String,
      required: [true, 'الاختصار مطلوب'],
      trim: true,
      maxlength: 30,
    },
    version: { type: String, trim: true },
    publisher: { type: String, trim: true },

    // ── التصنيف ─────────────────────────────────────────────────
    category: {
      type: String,
      required: [true, 'فئة المقياس مطلوبة'],
      enum: [
        'adaptive_behavior', // سلوك تكيفي
        'autism', // توحد
        'intelligence', // ذكاء
        'language', // لغة ونطق
        'motor', // حركي
        'behavioral', // سلوكي
        'developmental', // نمائي
        'academic', // أكاديمي
        'vocational', // مهني
        'psychological', // نفسي
        'functional', // وظيفي
        'sensory', // حسي
        'neurological', // عصبي
      ],
      index: true,
    },

    // التخصصات المعنية
    specializations: {
      type: [String],
      required: [true, 'التخصصات مطلوبة'],
      // aba, speech, pt, ot, psychology, special_education, social_work
    },

    // الإعاقات المستهدفة
    target_disabilities: {
      type: [String],
      default: [],
      // autism, intellectual, learning, adhd, cp, down_syndrome, hearing, visual ...
    },

    // ── الفئة العمرية ────────────────────────────────────────────
    min_age_months: {
      type: Number,
      required: [true, 'الحد الأدنى للعمر مطلوب'],
      default: 0,
      min: 0,
    },
    max_age_months: {
      type: Number,
      default: null, // null = بلا حد أقصى
    },

    // ── الوصف والتعليمات ─────────────────────────────────────────
    description_ar: { type: String, trim: true },
    description_en: { type: String, trim: true },
    administration_instructions_ar: { type: String, trim: true },
    administration_instructions_en: { type: String, trim: true },

    // ── إعدادات التطبيق ──────────────────────────────────────────
    estimated_duration_minutes: { type: Number, min: 1 },
    administration_format: {
      type: String,
      enum: [
        'direct_assessment', // تقييم مباشر
        'interview', // مقابلة
        'observation', // ملاحظة
        'questionnaire', // استبيان
        'mixed', // مختلط
      ],
      default: 'direct_assessment',
    },
    respondent_types: {
      type: [String],
      default: [],
      // parent, teacher, caregiver, self, clinician
    },

    // ── نظام التسجيل ─────────────────────────────────────────────
    scoring_system: {
      type: String,
      required: [true, 'نظام التسجيل مطلوب'],
      enum: [
        'standard_scores', // درجات معيارية (متوسط 100، انحراف 15)
        'percentile_ranks', // رتب مئينية
        'age_equivalents', // أعمار معادلة
        't_scores', // T-scores (متوسط 50، انحراف 10)
        'raw_scores', // درجات خام فقط
        'criterion_based', // محكي المرجع
        'mastery_based', // قائم على الإتقان
        'iq_scores', // نسب ذكاء
        'developmental_index', // مؤشر نمائي
        'percentage', // نسبة مئوية
        'custom', // مخصص
      ],
    },

    // إعدادات التسجيل التفصيلية
    scoring_config: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      /*
        مثال Vineland:   { mean: 100, sd: 15, min: 20, max: 160,
                           levels: { high: [115, 999], adequate: [86, 114], moderately_low: [71, 85], low: [0, 70] } }
        مثال CARS-2:     { total_min: 15, total_max: 60,
                           cutoffs: { no_autism: [15, 29.5], mild_moderate: [30, 36.5], severe: [37, 60] } }
        مثال GMFM-88:    { scoring: 'percentage', dimensions: ['A','B','C','D','E'] }
        مثال VB-MAPP:    { levels: [1,2,3], mastery_values: [0, 0.5, 1] }
      */
    },

    // دليل التفسير
    interpretation_guide_ar: { type: mongoose.Schema.Types.Mixed, default: {} },
    interpretation_guide_en: { type: mongoose.Schema.Types.Mixed, default: {} },

    // ── الترخيص والملكية ─────────────────────────────────────────
    copyright_holder: { type: String, trim: true },
    requires_license: { type: Boolean, default: true },
    license_info: { type: String, trim: true },

    // ── الحالة والترتيب ───────────────────────────────────────────
    is_active: { type: Boolean, default: true, index: true },
    sort_order: { type: Number, default: 0 },

    // ── الإنشاء ───────────────────────────────────────────────────
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ── الحذف الناعم ──────────────────────────────────────────────
    is_deleted: { type: Boolean, default: false, index: true },
    deleted_at: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: 'assessment_tools',
  }
);

// ── الفهارس ────────────────────────────────────────────────────
assessmentToolSchema.index({ category: 1, is_active: 1 });
assessmentToolSchema.index({ min_age_months: 1, max_age_months: 1 });
// REMOVED DUPLICATE: code already has unique:true in field definition

// ── Virtuals ────────────────────────────────────────────────────
assessmentToolSchema.virtual('age_range_display').get(function () {
  const formatAge = months => {
    if (months < 12) return `${Math.round(months)} شهر`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? `${years} سنة و${Math.round(rem)} شهر` : `${years} سنة`;
  };
  const min = formatAge(this.min_age_months);
  const max = this.max_age_months ? formatAge(this.max_age_months) : 'بلا حد';
  return `${min} – ${max}`;
});

// ── Statics ─────────────────────────────────────────────────────

/**
 * البحث عن مقاييس مناسبة لعمر معين
 */
assessmentToolSchema.statics.findForAge = function (ageMonths) {
  return this.find({
    is_active: true,
    is_deleted: { $ne: true },
    min_age_months: { $lte: ageMonths },
    $or: [{ max_age_months: null }, { max_age_months: { $gte: ageMonths } }],
  });
};

/**
 * البحث النصي
 */
assessmentToolSchema.statics.searchByText = function (term) {
  const safe = String(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(safe, 'i');
  return this.find({
    is_active: true,
    is_deleted: { $ne: true },
    $or: [
      { name_ar: regex },
      { name_en: regex },
      { abbreviation: regex },
      { code: regex },
      { description_ar: regex },
    ],
  });
};

/**
 * المقاييس حسب التخصص
 */
assessmentToolSchema.statics.findBySpecialization = function (spec) {
  return this.find({
    is_active: true,
    is_deleted: { $ne: true },
    specializations: spec,
  });
};

module.exports =
  mongoose.models.AssessmentTool || mongoose.model('AssessmentTool', assessmentToolSchema);
