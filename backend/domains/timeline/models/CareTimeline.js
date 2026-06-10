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
        'behavior_incident', // W970 — behavior subscriber (already on main) needs this enum value
        // Clinical safety (W992 — unified-core linkage)
        'seizure_event',
        'safeguarding_concern',
        'safeguarding_concern_closed', // W1027 — safeguarding concern closed → unified core
        'restraint_seclusion',
        // Sensory screenings (W993 — unified-core linkage)
        'screening_completed',
        // Medication administration (W994 — unified-core linkage)
        'medication_dose_recorded',
        // Discharge / end of service (W995 — unified-core linkage)
        'discharge_completed',
        // Admission / enrollment from waitlist (W996 — unified-core linkage)
        'admission_enrolled',
        // Referral conversion / loop closed (W997 — unified-core linkage)
        'referral_converted',
        // Medical referral completion (W1001 — unified-core linkage)
        'medical_referral_completed',
        // Measurement/assessment result approved (W1022 — unified-core linkage)
        'measurement_result_approved',
        // Insurance claim paid (W1000 — unified-core linkage)
        'insurance_claim_paid',
        // Invoice fully paid (W1023 — unified-core linkage)
        'invoice_paid',
        // Tele-rehab consultation completed (W1024 — unified-core linkage)
        'teleconsultation_completed',
        // Home visit completed (W1025 — unified-core linkage)
        'home_visit_completed',
        // Family counselling session completed (W1026 — unified-core linkage)
        'family_counselling_completed',
        // Assistive device returned (W1028 — unified-core linkage)
        'assistive_device_returned',
        // Respite booking completed (W1029 — unified-core linkage)
        'respite_completed',
        // Transition plan completed (W1030 — unified-core linkage)
        'transition_completed',
        // Diet prescription activated (W1031 — unified-core linkage)
        'diet_prescription_activated',
        // Behavior plan completed (W1032 — unified-core linkage)
        'behavior_plan_completed',
        // AAC communication aid profile activated (W1042 — unified-core linkage)
        'communication_aid_activated',
        // AI-generated report sent to family (W1043 — unified-core linkage)
        'ai_report_sent',
        // Adaptive sports program completed (W1044 — unified-core linkage)
        'adaptive_sports_completed',
        // Individual Education Plan activated (W1045 — unified-core linkage)
        'iep_activated',
        // Vaccination administered (W1046 — unified-core linkage)
        'vaccination_administered',
        // Family home program completed (W1047 — unified-core linkage)
        'family_home_program_completed',
        // Spasticity injection completed (W1048 — unified-core linkage)
        'spasticity_injection_completed',
        'prosthetic_orthotic_delivered',
        'seating_postural_finalized',
        'sensory_diet_completed',
        'prior_authorization_approved',
        'plan_review_recorded',
        'swallow_study_completed',
        'crisis_incident_resolved',
        'iq_assessment_completed',
        'creative_arts_therapy_completed',
        'insurance_eligibility_checked',
        'morning_health_check_flagged',
        'differential_diagnosis_confirmed',
        'community_referral_completed',
        'clinical_pathway_completed',
        'aac_pecs_phase_advanced',
        'pain_assessment_finalized',
        'dysphagia_assessment_finalized',
        'allergy_recorded',
        'dtt_session_completed',
        'goal_progress_achieved',
        'adjunct_therapy_completed',
        'disability_card_registered',
        'portfolio_milestone_added',
        'physiotherapy_assessment_finalized',
        'service_contract_activated',
        'subsidy_payment_received',
        'sponsorship_activated',
        'potty_request_milestone',
        'home_practice_completed',
        'medication_order_started',
        'family_visit_approved',
        'bip_fidelity_checked',
        'goal_progress_recorded',
        'cdss_risk_assessed',
        'red_flag_raised',
        'session_attendance_missed',
        'nps_response_recorded',
        'daily_comm_log_published',
        'consent_record_granted',
        'risk_snapshot_escalated',
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
