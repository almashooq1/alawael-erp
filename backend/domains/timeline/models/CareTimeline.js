/**
 * CareTimeline Model — الخط الزمني الطولي الموحد
 *
 * يُسجّل كل حدث مهم في رحلة المستفيد:
 *  - تقييم، جلسة، تعديل خطة، قرار سريري، تواصل أسري،
 *    تنبيه مخاطر، مراجعة جودة، تحويل، خروج...
 *
 * @module domains/timeline/models/CareTimeline
 */

const mongoose = require('mongoose');

const careTimelineSchema = new mongoose.Schema(
  {
    // ── Core Links ─────────────────────────────────────────────────────
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

    // ── Event Details ──────────────────────────────────────────────────
    eventType: {
      type: String,
      enum: [
        // Lifecycle
        'registration',
        'admission',
        'discharge',
        'transfer',
        'readmission',
        // Clinical
        'assessment_completed',
        'assessment_scheduled',
        'reassessment_due',
        'care_plan_created',
        'care_plan_updated',
        'care_plan_approved',
        'session_completed',
        'session_cancelled',
        'session_no_show',
        'goal_created',
        'goal_achieved',
        'goal_failed',
        'goal_updated',
        'measure_applied',
        'measure_result',
        // Workflow
        'phase_advanced',
        'phase_blocked',
        'approval_requested',
        'approval_granted',
        'approval_rejected',
        // Team
        'team_member_added',
        'team_member_removed',
        'lead_changed',
        // Risk & Quality
        'risk_flag_raised',
        'risk_flag_resolved',
        'quality_alert',
        'compliance_issue',
        // Family
        'family_contact',
        'family_meeting',
        'consent_obtained',
        'home_program_assigned',
        // Communication
        'note_added',
        'document_uploaded',
        'message_sent',
        'notification_sent',
        // AI
        'recommendation_generated',
        'alert_triggered',
        'prediction_made',
        // Custom
        'custom',
      ],
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['clinical', 'administrative', 'communication', 'quality', 'system', 'family', 'ai'],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['info', 'success', 'warning', 'error', 'critical'],
      default: 'info',
    },

    // ── Content ────────────────────────────────────────────────────────
    title: { type: String, required: true },
    title_ar: String,
    description: String,
    description_ar: String,

    // ── Related Entity (الكيان المرتبط) ────────────────────────────
    relatedEntity: {
      type: {
        type: String,
        enum: [
          'Assessment',
          'CarePlan',
          'Session',
          'Goal',
          'Measure',
          'RiskFlag',
          'Document',
          'FamilyInteraction',
          'QualityCase',
          'User',
          'EpisodeOfCare',
          'Notification',
          'Custom',
        ],
      },
      id: mongoose.Schema.Types.ObjectId,
      label: String,
    },

    // ── Actors ─────────────────────────────────────────────────────────
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    performedByRole: String,
    performedByName: String,

    // ── Time ───────────────────────────────────────────────────────────
    occurredAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    // ── Data Snapshot ──────────────────────────────────────────────────
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    previousValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,

    // ── Visibility ─────────────────────────────────────────────────────
    isVisible: { type: Boolean, default: true },
    visibleTo: [
      {
        type: String,
        enum: ['all', 'clinical', 'admin', 'family', 'quality', 'management'],
      },
    ],

    // ── Multi-Tenancy ──────────────────────────────────────────────────
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'care_timeline',
  }
);

// ─── Indexes ────────────────────────────────────────────────────────────────

careTimelineSchema.index({ beneficiaryId: 1, occurredAt: -1 });
careTimelineSchema.index({ beneficiaryId: 1, eventType: 1, occurredAt: -1 });
careTimelineSchema.index({ episodeId: 1, occurredAt: -1 });
careTimelineSchema.index({ beneficiaryId: 1, category: 1, occurredAt: -1 });
careTimelineSchema.index({ occurredAt: -1 });
careTimelineSchema.index({ 'relatedEntity.type': 1, 'relatedEntity.id': 1 });

// ─── Static Methods ─────────────────────────────────────────────────────────

careTimelineSchema.statics.recordEvent = function (eventData) {
  return this.create(eventData);
};

careTimelineSchema.statics.getTimeline = async function (
  beneficiaryId,
  { episodeId, category, eventType, startDate, endDate, page = 1, limit = 50 } = {}
) {
  const query = { beneficiaryId, isVisible: true };
  if (episodeId) query.episodeId = episodeId;
  if (category) query.category = category;
  if (eventType) query.eventType = eventType;
  if (startDate || endDate) {
    query.occurredAt = {};
    if (startDate) query.occurredAt.$gte = new Date(startDate);
    if (endDate) query.occurredAt.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;
  const [events, total] = await Promise.all([
    this.find(query)
      .sort({ occurredAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('performedBy', 'firstName lastName')
      .lean(),
    this.countDocuments(query),
  ]);

  return {
    data: events,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

careTimelineSchema.statics.getEventSummary = async function (beneficiaryId, episodeId) {
  const match = { beneficiaryId: new mongoose.Types.ObjectId(beneficiaryId), isVisible: true };
  if (episodeId) match.episodeId = new mongoose.Types.ObjectId(episodeId);

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: { category: '$category', eventType: '$eventType' },
        count: { $sum: 1 },
        lastOccurred: { $max: '$occurredAt' },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

// ─── Export ──────────────────────────────────────────────────────────────────

const CareTimeline =
  mongoose.models.CareTimeline || mongoose.model('CareTimeline', careTimelineSchema);

module.exports = { CareTimeline, careTimelineSchema };
