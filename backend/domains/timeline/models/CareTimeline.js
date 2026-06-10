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
        'waitlisted', // W979
        'waitlist_booked', // W979 — booked from the waitlist (admission)
        'admission',
        'discharge',
        'transfer',
        'readmission',
        'status_changed', // W982 — beneficiary lifecycle status change
        'care_transition', // W986 — life-stage transition plan completed / cancelled
        'insurance_claim', // W994 — insurance claim approved / rejected (admin)
        // Clinical
        'assessment_completed',
        'screening_completed', // W980 — vision/hearing screening finalized
        'medication_administered', // W981
        'medication_not_given', // W981
        'followup_completed', // W987 — post-rehab follow-up case completed
        'followup_lost', // W987 — beneficiary lost to post-rehab follow-up
        'followup_visit', // W992 — post-rehab follow-up visit attended / missed
        'referral', // W997 — referral accepted / completed / rejected (any of 4 referral subsystems)
        'assessment_scheduled',
        'reassessment_due',
        'care_plan_created',
        'care_plan_updated',
        'care_plan_approved',
        'care_plan_completed',
        'session_completed',
        'session_cancelled',
        'session_no_show',
        // Appointments (W970 — unified-core linkage)
        'appointment_booked',
        'appointment_cancelled',
        'appointment_no_show',
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
        'complaint_filed', // W984
        'behavior_incident', // W970 — behavior subscriber (already on main) needs this enum value
        // Safety (W977)
        'seizure_event',
        'safeguarding_concern',
        'restraint_applied',
        'crisis_reported', // W1004 — acute crisis reported
        'crisis_resolved', // W1004 — acute crisis resolved / closed
        // Clinical Safety (W1046 — unified-core linkage of the W1010-W1042 modules)
        'falls_risk_assessed', // W1010 — falls-risk assessment finalized
        'pressure_injury', // W1011 — pressure injury identified
        'pressure_injury_resolved', // W1011 — pressure injury healed/closed
        'sleep_assessment', // W1020 — sleep assessment finalized
        'mobility_assessment', // W1021 — orientation & mobility assessment finalized
        'driving_assessment', // W1022 — driving-rehab assessment finalized
        'medication_reconciliation', // W1041 — medication reconciliation reconciled
        'infection_case', // W1042 — infection case opened / status change
        'infection_resolved', // W1042 — infection case resolved
        // Clinical Assessments trio (W1047 — W670-W673 islands linked)
        'dysphagia_assessment', // W670 — swallow-safety assessment finalized
        'pain_assessment', // W671 — pain assessment finalized
        'physiotherapy_assessment', // W672 — physiotherapy assessment finalized
        // Deferred islands now linked (W1075 — 8 per-beneficiary lifecycle models)
        'icf_assessment', // W1075 — ICF functioning profile approved
        'treatment_authorization', // W1075 — insurance treatment authorization decided
        'clinical_pathway_completed', // W1075 — clinical pathway plan completed
        'mdt_meeting', // W1075 — multidisciplinary team meeting completed
        'swallow_study', // W1075 — instrumental swallow study (VFSS/FEES) completed
        'emergency_plan_activated', // W1075 — per-beneficiary emergency plan activated
        'consultation', // W1075 — cross-discipline therapist consultation answered/closed
        'cdss_alert_resolved', // W1075 — CDSS alert resolved
        // Residual islands now linked (W1120 — 6 assessment/plan/CRPD lifecycle models)
        'adl_assessment', // W1120 — activities-of-daily-living assessment completed
        'integration_assessment', // W1120 — sensory-integration assessment completed
        'self_advocacy_completed', // W1120 — self-advocacy training plan completed (CRPD)
        'decision_rights_assessment', // W1120 — decision-rights capacity assessment finalized (CRPD)
        'independent_living_completed', // W1120 — independent-living plan completed
        'caregiver_support_completed', // W1120 — caregiver support program completed
        // Family
        'family_contact',
        'family_meeting',
        'consent_obtained',
        'consent_revoked', // W1002 — consent withdrawn (PDPL/CRPD)
        'home_program_assigned',
        'home_program_completed', // W1003 — home program completed
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
// REMOVED DUPLICATE: occurredAt already has field-level index:true
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
