/**
 * EnterpriseRisk — نموذج سجل المخاطر المؤسسية
 *
 * يُستخدم من enterprise-risk.routes.js عبر safeModel helper.
 * يُصدّر الاثنين: EnterpriseRisk و RiskAssessment (لتجنب حلقة require
 * عند عدم تسجيل RiskAssessment بعد في mongoose.models).
 */

const mongoose = require('mongoose');

// ── EnterpriseRisk ────────────────────────────────────────────────────────────

const mitigationSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, maxlength: 500 },
    owner: String,
    targetDate: Date,
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'completed', 'cancelled'],
      default: 'planned',
    },
    completedAt: Date,
    notes: String,
  },
  { _id: true }
);

const historySchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const enterpriseRiskSchema = new mongoose.Schema(
  {
    riskCode: { type: String, maxlength: 30, index: true },
    titleAr: { type: String, required: true, maxlength: 300, index: true },

    category: {
      type: String,
      required: true,
      enum: [
        'strategic',
        'operational',
        'financial',
        'compliance',
        'reputational',
        'technology',
        'environmental',
        'safety',
        'legal',
        'other',
      ],
      default: 'operational',
      index: true,
    },

    description: { type: String, maxlength: 2000 },

    probability: {
      type: String,
      enum: ['very_low', 'low', 'medium', 'high', 'very_high'],
      default: 'medium',
    },

    impact: {
      type: String,
      enum: ['very_low', 'low', 'medium', 'high', 'very_high'],
      default: 'medium',
    },

    priority: {
      type: String,
      required: true,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
      index: true,
    },

    status: {
      type: String,
      required: true,
      enum: [
        'identified',
        'assessed',
        'mitigating',
        'monitoring',
        'resolved',
        'accepted',
        'closed',
      ],
      default: 'identified',
      index: true,
    },

    // riskScore محسوب من probability × impact (يُخزَّن للفرز السريع)
    riskScore: { type: Number, default: 0, index: true },

    // مسؤول المخاطرة
    owner: String,
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, index: true },

    // تاريخ المراجعة الدورية
    reviewDate: Date,

    // إجراءات التخفيف
    mitigations: [mitigationSchema],

    // تاريخ التغييرات
    history: [historySchema],

    // متعدد الفروع
    branchId: { type: mongoose.Schema.Types.ObjectId, index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, index: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, index: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// حساب riskScore عند الحفظ
const PROB_MAP = { very_low: 1, low: 2, medium: 3, high: 4, very_high: 5 };
const IMP_MAP = { very_low: 1, low: 2, medium: 3, high: 4, very_high: 5 };

enterpriseRiskSchema.pre('save', async function () {
  this.riskScore = (PROB_MAP[this.probability] || 3) * (IMP_MAP[this.impact] || 3);
});

const EnterpriseRisk =
  mongoose.models.EnterpriseRisk || mongoose.model('EnterpriseRisk', enterpriseRiskSchema);

// ── Re-export RiskAssessment for safeModel('RiskAssessment') fallback ─────────
const RiskAssessment = require('./RiskAssessment');

module.exports = { EnterpriseRisk, RiskAssessment };
