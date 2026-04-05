/**
 * AssessmentDomainScore.js — درجات مجالات التقييم
 * Domain-level Scores for each Clinical Assessment
 */

'use strict';

const mongoose = require('mongoose');

const assessmentDomainScoreSchema = new mongoose.Schema(
  {
    // ── الارتباط ──────────────────────────────────────────────
    assessment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClinicalAssessment',
      required: [true, 'التقييم مطلوب'],
      index: true,
    },
    domain_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssessmentToolDomain',
      required: [true, 'المجال مطلوب'],
      index: true,
    },

    // ── الدرجات ───────────────────────────────────────────────
    raw_score: { type: Number, default: null },
    standard_score: { type: Number, default: null },
    percentile_rank: { type: Number, default: null, min: 0, max: 100 },
    age_equivalent: { type: String, trim: true }, // "24 شهر" أو "3 سنوات"
    growth_score: { type: Number, default: null }, // درجة النمو (VB-MAPP)
    scaled_score: { type: Number, default: null }, // الدرجة المحوّلة
    t_score: { type: Number, default: null }, // T-score (Conners, BASC)

    // ── التصنيف ───────────────────────────────────────────────
    classification: { type: String, trim: true }, // "مناسب للعمر"، "تحت المتوسط"...
    severity_level: { type: String, trim: true }, // "خفيف"، "معتدل"، "شديد"
    adaptive_level: { type: String, trim: true }, // Vineland: High, Adequate, Mod Low, Low

    // ── نسبة اكتمال المجال ────────────────────────────────────
    items_answered: { type: Number, default: 0 },
    items_total: { type: Number, default: 0 },
    items_skipped: { type: Number, default: 0 },
    completion_percentage: { type: Number, default: 0, min: 0, max: 100 },

    // ── ملاحظات ───────────────────────────────────────────────
    notes: { type: String, trim: true },
    interpretation: { type: String, trim: true },

    // ── مقارنة مع تقييم سابق ─────────────────────────────────
    previous_raw_score: { type: Number, default: null },
    previous_standard_score: { type: Number, default: null },
    score_change: { type: Number, default: null }, // الفرق
    change_direction: {
      type: String,
      enum: ['improved', 'declined', 'maintained', null],
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'assessment_domain_scores',
  }
);

// ── الفهارس ────────────────────────────────────────────────────
assessmentDomainScoreSchema.index({ assessment_id: 1, domain_id: 1 }, { unique: true });
// REMOVED DUPLICATE: assessmentDomainScoreSchema.index({ domain_id: 1 }); — field already has index:true

// ── Methods ─────────────────────────────────────────────────────

/**
 * تصنيف الدرجة المعيارية (نظام الدرجات المعيارية متوسط 100)
 */
assessmentDomainScoreSchema.methods.classifyStandardScore = function (score) {
  if (score === null || score === undefined) return null;
  if (score >= 130) return 'متفوق جداً';
  if (score >= 120) return 'متفوق';
  if (score >= 110) return 'فوق المتوسط';
  if (score >= 90) return 'متوسط';
  if (score >= 80) return 'تحت المتوسط';
  if (score >= 70) return 'حدّي';
  return 'ضعيف جداً';
};

/**
 * تصنيف T-score (متوسط 50، انحراف 10)
 */
assessmentDomainScoreSchema.methods.classifyTScore = function (score) {
  if (score === null || score === undefined) return null;
  if (score >= 70) return 'مرتفع جداً (ذو دلالة إكلينيكية)';
  if (score >= 60) return 'مرتفع (عرضة للخطر)';
  if (score >= 40) return 'متوسط';
  if (score >= 30) return 'منخفض';
  return 'منخفض جداً';
};

/**
 * تصنيف الرتبة المئينية
 */
assessmentDomainScoreSchema.methods.classifyPercentile = function (pct) {
  if (pct === null || pct === undefined) return null;
  if (pct >= 98) return 'متفوق جداً';
  if (pct >= 91) return 'فوق المتوسط';
  if (pct >= 75) return 'متوسط مرتفع';
  if (pct >= 25) return 'متوسط';
  if (pct >= 9) return 'تحت المتوسط';
  if (pct >= 2) return 'ضعيف';
  return 'ضعيف جداً';
};

module.exports =
  mongoose.models.AssessmentDomainScore ||
  mongoose.models.AssessmentDomainScore ||
  mongoose.models.AssessmentDomainScore ||
  mongoose.model('AssessmentDomainScore', assessmentDomainScoreSchema);
