/**
 * DecisionAlert Model — نموذج تنبيهات دعم القرار
 *
 * يمثل تنبيهاً ذكياً يُنشأ تلقائياً أو يدوياً
 * بناءً على قواعد سريرية أو تشغيلية للمساعدة في اتخاذ القرار
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const decisionAlertSchema = new Schema(
  {
    // Target
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', index: true },
    episodeId: { type: Schema.Types.ObjectId, ref: 'EpisodeOfCare' },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },

    // Alert info
    title: { type: String, required: true },
    titleAr: String,
    description: { type: String, required: true },
    category: {
      type: String,
      enum: [
        'clinical_risk',
        'treatment_gap',
        'outcome_decline',
        'compliance_issue',
        'resource_constraint',
        'deadline_approaching',
        'kpi_breach',
        'quality_concern',
        'family_engagement',
        'staffing',
        'documentation',
        'billing',
        'safety',
        'system',
      ],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['info', 'low', 'medium', 'high', 'critical'],
      required: true,
      index: true,
    },
    priority: { type: Number, min: 1, max: 5, default: 3 },

    // Source
    source: {
      type: {
        type: String,
        enum: ['rule_engine', 'kpi_monitor', 'ai_recommendation', 'manual', 'system', 'workflow'],
        required: true,
      },
      ruleId: String,
      kpiCode: String,
      domain: String,
      details: Schema.Types.Mixed,
    },

    // Status
    status: {
      type: String,
      enum: ['new', 'acknowledged', 'in_progress', 'resolved', 'dismissed', 'escalated', 'expired'],
      default: 'new',
      index: true,
    },

    // Assignment
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    assignedRole: String,
    escalatedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    escalatedAt: Date,

    // Actions
    suggestedActions: [
      {
        action: String,
        actionType: {
          type: String,
          enum: ['navigate', 'api_call', 'create_task', 'send_message', 'schedule', 'review'],
        },
        actionPayload: Schema.Types.Mixed,
        priority: Number,
      },
    ],
    actionsTaken: [
      {
        action: String,
        takenBy: { type: Schema.Types.ObjectId, ref: 'User' },
        takenAt: { type: Date, default: Date.now },
        outcome: String,
      },
    ],

    // Timeline
    acknowledgedAt: Date,
    acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolutionNotes: String,
    expiresAt: Date,

    // Metrics
    responseTimeMinutes: Number,
    resolutionTimeMinutes: Number,

    tags: [String],
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'decision_alerts',
  }
);

decisionAlertSchema.index({ status: 1, severity: 1, createdAt: -1 });
decisionAlertSchema.index({ assignedTo: 1, status: 1 });
decisionAlertSchema.index({ category: 1, createdAt: -1 });
decisionAlertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports =
  mongoose.models.DecisionAlert || mongoose.model('DecisionAlert', decisionAlertSchema);
