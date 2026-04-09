/**
 * QualityAudit — نموذج التدقيق والجودة
 *
 * يسجّل نتائج تدقيق آلي أو يدوي على ملف مستفيد
 * أو حلقة علاجية أو فريق
 *
 * @module domains/quality/models/QualityAudit
 */

const mongoose = require('mongoose');

// ─── Finding Sub-Schema ─────────────────────────────────────────────────────
const findingSchema = new mongoose.Schema(
  {
    ruleCode: { type: String, required: true },
    ruleName: String,
    category: {
      type: String,
      enum: [
        'completeness', // اكتمال النماذج
        'timeliness', // توقيت التوثيق
        'documentation', // جودة التوثيق
        'care_plan_adherence', // الالتزام بالخطة
        'reassessment', // إعادة التقييم
        'attendance', // الحضور
        'family_engagement', // التفاعل الأسري
        'safety', // السلامة
        'duplication', // التكرار
        'conflict', // التعارض
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'non_conformity', 'critical'],
      required: true,
    },
    description: { type: String, required: true },
    evidence: {
      sourceModel: String,
      sourceId: { type: mongoose.Schema.Types.ObjectId },
      field: String,
      expectedValue: mongoose.Schema.Types.Mixed,
      actualValue: mongoose.Schema.Types.Mixed,
    },
    score: { type: Number, min: 0, max: 100 }, // 100 = fully compliant
    resolved: { type: Boolean, default: false },
    resolvedAt: Date,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId },
  },
  { _id: true }
);

// ─── KPI Sub-Schema ─────────────────────────────────────────────────────────
const kpiSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      enum: [
        'documentation_completeness',
        'documentation_timeliness',
        'reassessment_compliance',
        'care_plan_adherence',
        'session_documentation_rate',
        'family_engagement_rate',
        'goal_update_rate',
        'attendance_rate',
        'average_phase_duration',
        'discharge_planning_timeliness',
      ],
    },
    name: String,
    value: { type: Number, required: true },
    target: { type: Number, default: 80 },
    unit: { type: String, default: '%' },
    status: {
      type: String,
      enum: ['met', 'near_target', 'below_target', 'critical'],
    },
  },
  { _id: false }
);

// ─── Main Schema ────────────────────────────────────────────────────────────
const qualityAuditSchema = new mongoose.Schema(
  {
    // ── Scope ───────────────────────────────────────────────────────────────
    scope: {
      type: String,
      enum: ['beneficiary', 'episode', 'team', 'branch', 'organization'],
      required: true,
      index: true,
    },
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      index: true,
    },
    episodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EpisodeOfCare',
      index: true,
    },
    teamId: { type: mongoose.Schema.Types.ObjectId, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, index: true },

    // ── Results ─────────────────────────────────────────────────────────────
    overallScore: { type: Number, min: 0, max: 100, required: true, index: true },
    complianceLevel: {
      type: String,
      enum: ['excellent', 'good', 'acceptable', 'needs_improvement', 'non_compliant'],
      required: true,
      index: true,
    },

    findings: [findingSchema],
    kpis: [kpiSchema],

    summary: {
      totalChecks: { type: Number, default: 0 },
      passed: { type: Number, default: 0 },
      warnings: { type: Number, default: 0 },
      nonConformities: { type: Number, default: 0 },
      critical: { type: Number, default: 0 },
    },

    // ── Audit Metadata ──────────────────────────────────────────────────────
    auditType: {
      type: String,
      enum: ['automated_scheduled', 'automated_event', 'manual', 'periodic_report'],
      default: 'automated_scheduled',
    },
    auditedAt: { type: Date, default: Date.now, index: true },
    auditedBy: { type: mongoose.Schema.Types.ObjectId },
    period: {
      from: Date,
      to: Date,
    },

    // ── Corrective actions ──────────────────────────────────────────────────
    correctiveActionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CorrectiveAction' }],

    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'quality_audits',
  }
);

// ── Indexes ─────────────────────────────────────────────────────────────────
qualityAuditSchema.index({ scope: 1, branchId: 1, auditedAt: -1 });
qualityAuditSchema.index({ beneficiaryId: 1, auditedAt: -1 });
qualityAuditSchema.index({ complianceLevel: 1, branchId: 1 });

module.exports = mongoose.models.QualityAudit || mongoose.model('QualityAudit', qualityAuditSchema);
