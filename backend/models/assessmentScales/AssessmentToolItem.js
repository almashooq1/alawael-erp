/**
 * AssessmentToolItem.js — بنود أدوات التقييم
 * Assessment Tool Items / Questions
 *
 * كل مقياس يحتوي على مجموعة بنود مرتبطة بمجالاته
 */

'use strict';

const mongoose = require('mongoose');

const assessmentToolItemSchema = new mongoose.Schema(
  {
    // ── الارتباط ──────────────────────────────────────────────
    tool_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssessmentTool',
      required: [true, 'المقياس مطلوب'],
      index: true,
    },
    domain_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssessmentToolDomain',
      required: [true, 'المجال مطلوب'],
      index: true,
    },

    // ── رقم وتعريف البند ─────────────────────────────────────
    item_number: {
      type: String,
      required: [true, 'رقم البند مطلوب'],
      trim: true,
      maxlength: 20,
      // 1, 2, A1, B3, MAND-1 ...
    },
    text_ar: { type: String, required: [true, 'نص البند بالعربية مطلوب'], trim: true },
    text_en: { type: String, trim: true },

    // ── التعليمات والمواد ─────────────────────────────────────
    instructions_ar: { type: String, trim: true },
    instructions_en: { type: String, trim: true },
    materials_needed: { type: String, trim: true }, // المواد المطلوبة
    administration_notes: { type: String, trim: true },

    // ── خيارات التسجيل ───────────────────────────────────────
    scoring_options: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'خيارات التسجيل مطلوبة'],
      /*
        مثال CARS-2:
        [
          { value: 1,   label_ar: "مناسب للعمر",         label_en: "Age-appropriate" },
          { value: 1.5, label_ar: "بين الطبيعي والخفيف", label_en: "Between normal/mild" },
          { value: 2,   label_ar: "غير طبيعي طفيف",      label_en: "Mildly abnormal" },
          { value: 2.5, label_ar: "بين الطفيف والمعتدل", label_en: "Between mild/moderate" },
          { value: 3,   label_ar: "غير طبيعي معتدل",     label_en: "Moderately abnormal" },
          { value: 3.5, label_ar: "بين المعتدل والشديد", label_en: "Between moderate/severe" },
          { value: 4,   label_ar: "غير طبيعي شديد",      label_en: "Severely abnormal" }
        ]

        مثال VB-MAPP:
        [
          { value: 0,   label_ar: "غير متقن",  label_en: "Not mastered" },
          { value: 0.5, label_ar: "ناشئ",       label_en: "Emerging" },
          { value: 1,   label_ar: "متقن",       label_en: "Mastered" }
        ]

        مثال GMFM (0-3):
        [
          { value: 0, label_ar: "لا يبدأ",                  label_en: "Does not initiate" },
          { value: 1, label_ar: "يبدأ (أقل من 10%)",         label_en: "Initiates < 10%" },
          { value: 2, label_ar: "يكمل جزئياً (10-99%)",      label_en: "Partially completes" },
          { value: 3, label_ar: "يكمل المهمة",               label_en: "Completes" }
        ]
      */
    },

    // ── نطاق الدرجة ──────────────────────────────────────────
    min_score: { type: Number, default: 0 },
    max_score: { type: Number, required: [true, 'الدرجة العظمى مطلوبة'] },
    allows_half_scores: { type: Boolean, default: false }, // نصف درجة
    is_reverse_scored: { type: Boolean, default: false }, // تسجيل عكسي

    // ── الفئة العمرية للبند ──────────────────────────────────
    applicable_min_age_months: { type: Number, default: null },
    applicable_max_age_months: { type: Number, default: null },

    // ── مستوى VB-MAPP ────────────────────────────────────────
    vbmapp_level: {
      type: Number,
      enum: [1, 2, 3],
      default: null, // للمقاييس التي تستخدم مستويات
    },
    vbmapp_milestone: { type: String, trim: true },

    // ── خصائص البند ──────────────────────────────────────────
    sort_order: { type: Number, default: 0 },
    is_required: { type: Boolean, default: true },
    is_active: { type: Boolean, default: true },

    // ── ملاحظات إضافية ────────────────────────────────────────
    clinical_notes: { type: String, trim: true },
    references: { type: String, trim: true }, // مرجع البند
  },
  {
    timestamps: true,
    collection: 'assessment_tool_items',
  }
);

// ── الفهارس ────────────────────────────────────────────────────
assessmentToolItemSchema.index({ tool_id: 1, domain_id: 1 });
assessmentToolItemSchema.index({ domain_id: 1, item_number: 1 }, { unique: true });
assessmentToolItemSchema.index({ domain_id: 1, sort_order: 1 });
assessmentToolItemSchema.index({ is_active: 1 });

// ── Methods ─────────────────────────────────────────────────────

/**
 * التحقق من قابلية تطبيق البند حسب عمر المستفيد
 */
assessmentToolItemSchema.methods.isApplicableForAge = function (ageMonths) {
  if (this.applicable_min_age_months !== null && ageMonths < this.applicable_min_age_months) {
    return false;
  }
  if (this.applicable_max_age_months !== null && ageMonths > this.applicable_max_age_months) {
    return false;
  }
  return true;
};

/**
 * التحقق من صحة الدرجة المُدخلة
 */
assessmentToolItemSchema.methods.isValidScore = function (score) {
  if (score === null || score === undefined) return false;
  if (score < this.min_score || score > this.max_score) return false;
  if (!this.allows_half_scores && score % 1 !== 0) return false;
  // التحقق من وجود الخيار في قائمة الخيارات
  if (Array.isArray(this.scoring_options)) {
    return this.scoring_options.some(opt => opt.value === score);
  }
  return true;
};

module.exports =
  mongoose.models.AssessmentToolItem ||
  mongoose.models.AssessmentToolItem ||
  mongoose.model('AssessmentToolItem', assessmentToolItemSchema);
