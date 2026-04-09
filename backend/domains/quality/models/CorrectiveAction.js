/**
 * CorrectiveAction — نموذج الإجراءات التصحيحية
 *
 * يُنشأ تلقائياً عند اكتشاف عدم مطابقة أو يدوياً بواسطة مشرف الجودة
 *
 * @module domains/quality/models/CorrectiveAction
 */

const mongoose = require('mongoose');

const correctiveActionSchema = new mongoose.Schema(
  {
    auditId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QualityAudit',
      required: true,
      index: true,
    },
    findingId: { type: mongoose.Schema.Types.ObjectId }, // reference to specific finding in audit

    // ── Scope ───────────────────────────────────────────────────────────────
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      index: true,
    },
    episodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'EpisodeOfCare' },

    // ── Classification ──────────────────────────────────────────────────────
    type: {
      type: String,
      enum: [
        'complete_documentation',
        'schedule_reassessment',
        'update_care_plan',
        'contact_family',
        'resolve_conflict',
        'remove_duplicate',
        'escalate_to_supervisor',
        'training_required',
        'process_improvement',
        'equipment_request',
        'custom',
      ],
      required: true,
    },

    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
    },

    // ── Content ─────────────────────────────────────────────────────────────
    title: { type: String, required: true, maxlength: 200 },
    description: String,
    requiredAction: { type: String, required: true },

    // ── Assignment ──────────────────────────────────────────────────────────
    assignedTo: { type: mongoose.Schema.Types.ObjectId, index: true },
    assignedRole: String,
    assignedTeamId: { type: mongoose.Schema.Types.ObjectId },
    dueDate: { type: Date, required: true, index: true },
    escalationDate: Date, // auto-escalate if not resolved

    // ── Lifecycle ───────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['open', 'in_progress', 'pending_review', 'resolved', 'closed', 'escalated', 'overdue'],
      default: 'open',
      index: true,
    },

    startedAt: Date,
    resolvedAt: Date,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId },
    resolutionNote: String,
    verifiedAt: Date,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId },
    closedAt: Date,

    // ── Escalation ──────────────────────────────────────────────────────────
    escalationLevel: { type: Number, default: 0 },
    escalatedTo: { type: mongoose.Schema.Types.ObjectId },
    escalationHistory: [
      {
        level: Number,
        escalatedTo: { type: mongoose.Schema.Types.ObjectId },
        reason: String,
        at: Date,
      },
    ],

    // ── Multi-tenant ────────────────────────────────────────────────────────
    branchId: { type: mongoose.Schema.Types.ObjectId, index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, index: true },

    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'corrective_actions',
  }
);

// ── Indexes ─────────────────────────────────────────────────────────────────
correctiveActionSchema.index({ status: 1, dueDate: 1 });
correctiveActionSchema.index({ assignedTo: 1, status: 1 });
correctiveActionSchema.index({ branchId: 1, status: 1, severity: 1 });

module.exports =
  mongoose.models.CorrectiveAction || mongoose.model('CorrectiveAction', correctiveActionSchema);
