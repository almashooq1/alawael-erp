/**
 * AssessmentToolDomain.js — مجالات أدوات التقييم
 * Assessment Tool Domains (Sub-scales / Areas)
 *
 * مثال Vineland: Communication, Daily Living Skills, Socialization, Motor Skills
 * مثال GMFM-88:  A (Lying), B (Sitting), C (Crawling), D (Standing), E (Walking)
 * مثال CARS-2:   15 بنداً في مجال واحد (MAIN)
 */

'use strict';

const mongoose = require('mongoose');

const assessmentToolDomainSchema = new mongoose.Schema(
  {
    // ── الارتباط بالمقياس ─────────────────────────────────────
    tool_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssessmentTool',
      required: [true, 'المقياس مطلوب'],
      index: true,
    },

    // المجال الأب (للمجالات الفرعية)
    parent_domain_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssessmentToolDomain',
      default: null,
      index: true,
    },

    // ── البيانات الأساسية ─────────────────────────────────────
    code: {
      type: String,
      required: [true, 'رمز المجال مطلوب'],
      trim: true,
      maxlength: 30,
      // A, B, C, COMM, MOTOR, SOC ...
    },
    name_ar: { type: String, required: [true, 'اسم المجال بالعربية مطلوب'], trim: true },
    name_en: { type: String, trim: true },
    description_ar: { type: String, trim: true },
    description_en: { type: String, trim: true },

    // ── نظام التسجيل ─────────────────────────────────────────
    scoring_type: {
      type: String,
      enum: [
        'sum', // مجموع الدرجات
        'average', // متوسط
        'standard_score', // درجة معيارية محولة
        'age_equivalent', // عمر معادل
        'percentage', // نسبة مئوية (GMFM)
        'level', // مستوى (VB-MAPP)
        'composite', // مركّب من مجالات فرعية
        'raw_only', // خام فقط
      ],
      default: 'sum',
    },
    max_raw_score: { type: Number, default: null },
    min_raw_score: { type: Number, default: 0 },

    // ── جدول التحويل (خام → معياري) ─────────────────────────
    conversion_table: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      /*
        الشكل العام:
        {
          general: { "0-5": { standard: 40, percentile: 1 }, ... },
          by_age: {
            "24-35": { "0-5": { standard: 45, percentile: 2 }, ... },
            ...
          }
        }
      */
    },

    // ── معايير الأعمار (Norms) ────────────────────────────────
    norms: { type: mongoose.Schema.Types.Mixed, default: null },

    // ── عدد البنود ────────────────────────────────────────────
    items_count: { type: Number, default: 0 },

    // ── الترتيب والإلزامية ───────────────────────────────────
    sort_order: { type: Number, default: 0 },
    is_required: { type: Boolean, default: true }, // إلزامي أم اختياري
    is_active: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: 'assessment_tool_domains',
  }
);

// ── الفهارس ────────────────────────────────────────────────────
assessmentToolDomainSchema.index({ tool_id: 1, code: 1 }, { unique: true });
assessmentToolDomainSchema.index({ tool_id: 1, sort_order: 1 });
// REMOVED DUPLICATE: assessmentToolDomainSchema.index({ parent_domain_id: 1 }); — field already has index:true

// ── Methods ─────────────────────────────────────────────────────

/**
 * تحويل الدرجة الخام إلى معيارية باستخدام جدول التحويل
 * @param {number} rawScore
 * @param {number|null} ageMonths
 * @returns {object|null}
 */
assessmentToolDomainSchema.methods.convertRawToStandard = function (rawScore, ageMonths = null) {
  if (!this.conversion_table) return null;

  const table = this.conversion_table;

  // أولوية: جدول حسب العمر
  if (ageMonths !== null && table.by_age) {
    for (const [ageRange, conversions] of Object.entries(table.by_age)) {
      const [minAge, maxAge] = ageRange.split('-').map(Number);
      if (ageMonths >= minAge && ageMonths <= maxAge) {
        return this._lookupInTable(conversions, rawScore);
      }
    }
  }

  // جدول عام
  if (table.general) {
    return this._lookupInTable(table.general, rawScore);
  }

  return null;
};

assessmentToolDomainSchema.methods._lookupInTable = function (conversions, rawScore) {
  for (const [range, result] of Object.entries(conversions)) {
    if (range.includes('-')) {
      const [min, max] = range.split('-').map(Number);
      if (rawScore >= min && rawScore <= max) return result;
    } else if (Number(range) === rawScore) {
      return result;
    }
  }
  return null;
};

// ── Statics ─────────────────────────────────────────────────────

/**
 * المجالات الجذرية (بدون أب)
 */
assessmentToolDomainSchema.statics.findRootDomains = function (toolId) {
  return this.find({
    tool_id: toolId,
    parent_domain_id: null,
    is_active: true,
  }).sort({ sort_order: 1 });
};

/**
 * المجالات الفرعية
 */
assessmentToolDomainSchema.statics.findChildren = function (parentId) {
  return this.find({
    parent_domain_id: parentId,
    is_active: true,
  }).sort({ sort_order: 1 });
};

module.exports =
  mongoose.models.AssessmentToolDomain ||
  mongoose.models.AssessmentToolDomain ||
  mongoose.model('AssessmentToolDomain', assessmentToolDomainSchema);
