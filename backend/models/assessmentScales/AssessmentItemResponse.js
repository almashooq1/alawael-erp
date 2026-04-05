/**
 * AssessmentItemResponse.js — إجابات بنود التقييم
 * Item-level Responses for Clinical Assessments
 *
 * كل سجل يمثل إجابة أخصائي على بند واحد في تقييم معين
 */

'use strict';

const mongoose = require('mongoose');

const assessmentItemResponseSchema = new mongoose.Schema(
  {
    // ── الارتباط ──────────────────────────────────────────────
    assessment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClinicalAssessment',
      required: [true, 'التقييم مطلوب'],
      index: true,
    },
    item_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssessmentToolItem',
      required: [true, 'البند مطلوب'],
      index: true,
    },

    // ── الإجابة ───────────────────────────────────────────────
    score: { type: Number, default: null }, // الدرجة الرقمية
    response_value: { type: String, trim: true }, // قيمة نصية (إذا احتاج)

    // ── ملاحظات ────────────────────────────────────────────────
    notes: { type: String, trim: true, maxlength: 1000 },

    // ── التخطي ────────────────────────────────────────────────
    is_skipped: { type: Boolean, default: false },
    skip_reason: { type: String, trim: true },

    // ── بيانات المحاولات (للمقاييس الأدائية كـ VB-MAPP) ──────
    trial_data: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      /*
        مثال:
        {
          attempt_1: 1, attempt_2: 0, attempt_3: 1,
          total_correct: 2, total_attempts: 3,
          accuracy: 66.7
        }
      */
    },

    // ── توقيت الإجابة ─────────────────────────────────────────
    responded_at: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: 'assessment_item_responses',
  }
);

// ── الفهارس ────────────────────────────────────────────────────
assessmentItemResponseSchema.index({ assessment_id: 1, item_id: 1 }, { unique: true });
// REMOVED DUPLICATE: assessmentItemResponseSchema.index({ assessment_id: 1 }); — field already has index:true
// REMOVED DUPLICATE: assessmentItemResponseSchema.index({ item_id: 1 }); — field already has index:true

// ── Statics ─────────────────────────────────────────────────────

/**
 * جلب كل إجابات تقييم معين مفهرسة بـ item_id
 */
assessmentItemResponseSchema.statics.getResponsesMap = async function (assessmentId) {
  const responses = await this.find({ assessment_id: assessmentId }).lean();
  const map = {};
  responses.forEach(r => {
    map[r.item_id.toString()] = r;
  });
  return map;
};

/**
 * حساب الدرجة الخام لمجال معين
 */
assessmentItemResponseSchema.statics.calcDomainRawScore = async function (assessmentId, itemIds) {
  const result = await this.aggregate([
    {
      $match: {
        assessment_id: new mongoose.Types.ObjectId(assessmentId),
        item_id: { $in: itemIds.map(id => new mongoose.Types.ObjectId(id)) },
        is_skipped: { $ne: true },
        score: { $ne: null },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$score' },
        count: { $sum: 1 },
      },
    },
  ]);
  return result[0] || { total: 0, count: 0 };
};

/**
 * عدد الإجابات المسجّلة لتقييم معين
 */
assessmentItemResponseSchema.statics.countAnswered = function (assessmentId) {
  return this.countDocuments({
    assessment_id: assessmentId,
    $or: [{ score: { $ne: null } }, { is_skipped: true }],
  });
};

module.exports =
  mongoose.models.AssessmentItemResponse ||
  mongoose.models.AssessmentItemResponse ||
  mongoose.models.AssessmentItemResponse ||
  mongoose.model('AssessmentItemResponse', assessmentItemResponseSchema);
