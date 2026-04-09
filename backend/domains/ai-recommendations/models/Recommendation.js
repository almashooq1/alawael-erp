/**
 * Recommendation — نموذج التوصيات الذكية
 *
 * يمثل توصية واحدة قابلة للتنفيذ (Actionable Recommendation)
 * مع تفسير واضح وربط بالسياق السريري
 *
 * @module domains/ai-recommendations/models/Recommendation
 */

const mongoose = require('mongoose');

// ─── Action Sub-Schema ──────────────────────────────────────────────────────
const actionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        'reassess',
        'modify_care_plan',
        'schedule_session',
        'escalate_to_supervisor',
        'mdt_review',
        'contact_family',
        'change_therapist',
        'adjust_frequency',
        'add_measure',
        'discharge_review',
        'enroll_program',
        'behavior_intervention',
        'medical_referral',
        'home_visit',
        'tele_session',
        'documentation_followup',
        'waitlist_priority',
        'resource_request',
      ],
    },
    label: { type: String, required: true },
    description: String,
    targetModel: String, // e.g. 'ClinicalSession', 'ClinicalAssessment'
    targetId: { type: mongoose.Schema.Types.ObjectId },
    parameters: mongoose.Schema.Types.Mixed, // e.g. { measureCode: 'VABS3' }
    dueDate: Date,
    assignedRole: String,
    assignedUserId: { type: mongoose.Schema.Types.ObjectId },
  },
  { _id: false }
);

// ─── Explanation Sub-Schema ─────────────────────────────────────────────────
const explanationSchema = new mongoose.Schema(
  {
    summary: { type: String, required: true }, // جملة واضحة للأخصائي
    details: String, // تفاصيل إضافية
    dataPoints: [
      {
        label: String,
        value: mongoose.Schema.Types.Mixed,
        source: String,
        date: Date,
      },
    ],
    rules: [String], // أسماء القواعد التي فعّلت هذه التوصية
    confidence: { type: Number, min: 0, max: 1, default: 1 },
  },
  { _id: false }
);

// ─── Main Schema ────────────────────────────────────────────────────────────
const recommendationSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    episodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EpisodeOfCare',
      index: true,
    },

    // ── Classification ──────────────────────────────────────────────────────
    type: {
      type: String,
      required: true,
      enum: [
        'clinical_alert', // تنبيه سريري
        'reassessment_due', // إعادة تقييم مستحقة
        'care_plan_revision', // تعديل خطة رعاية
        'quality_escalation', // تصعيد جودة
        'attendance_concern', // قلق حضور
        'family_engagement', // تفاعل أسري
        'progress_stall', // توقف تقدم
        'goal_achievement', // إنجاز هدف — اقتراح هدف جديد
        'discharge_readiness', // جاهزية خروج
        'risk_mitigation', // تخفيف مخاطر
        'resource_optimization', // تحسين موارد
        'documentation_gap', // فجوة توثيق
        'priority_case', // حالة ذات أولوية
      ],
      index: true,
    },

    category: {
      type: String,
      enum: ['clinical', 'operational', 'quality', 'family', 'safety'],
      required: true,
      index: true,
    },

    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      required: true,
      index: true,
    },

    // ── Content ─────────────────────────────────────────────────────────────
    title: { type: String, required: true, maxlength: 200 },
    explanation: { type: explanationSchema, required: true },
    suggestedActions: [actionSchema],

    // ── Source ───────────────────────────────────────────────────────────────
    riskScoreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClinicalRiskScore',
    },
    generatedBy: {
      type: String,
      enum: ['rule_engine', 'schedule', 'event_trigger', 'manual'],
      default: 'rule_engine',
    },
    ruleCodes: [String], // القواعد التى أنتجت التوصية

    // ── Lifecycle ───────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: [
        'pending', // جديدة — تنتظر مراجعة
        'viewed', // شوهدت
        'accepted', // قُبلت
        'rejected', // رُفضت مع سبب
        'in_progress', // قيد التنفيذ
        'completed', // نُفذت
        'expired', // انتهت صلاحيتها
        'superseded', // استُبدلت بتوصية أحدث
      ],
      default: 'pending',
      index: true,
    },

    viewedAt: Date,
    viewedBy: { type: mongoose.Schema.Types.ObjectId },
    respondedAt: Date,
    respondedBy: { type: mongoose.Schema.Types.ObjectId },
    responseNote: String,
    completedAt: Date,
    expiresAt: Date,

    // ── Outcome tracking ────────────────────────────────────────────────────
    outcome: {
      wasHelpful: Boolean,
      impactNote: String,
      ratedAt: Date,
      ratedBy: { type: mongoose.Schema.Types.ObjectId },
    },

    // ── Multi-tenant ────────────────────────────────────────────────────────
    branchId: { type: mongoose.Schema.Types.ObjectId, index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, index: true },

    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'recommendations',
  }
);

// ── Indexes ─────────────────────────────────────────────────────────────────
recommendationSchema.index({ beneficiaryId: 1, status: 1, createdAt: -1 });
recommendationSchema.index({ status: 1, priority: 1, branchId: 1 });
recommendationSchema.index({ type: 1, branchId: 1, createdAt: -1 });
recommendationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL for expired

module.exports =
  mongoose.models.Recommendation || mongoose.model('Recommendation', recommendationSchema);
