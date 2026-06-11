'use strict';

/**
 * FamilyCounsellingSession — W470.
 *
 * Per-family counselling encounter delivered by the Family Counsellor
 * (W464-reserved canonical role). Counselling is the operational
 * complement to the WBCI snapshot (W467) — when WBCI flags risk, the
 * trigger engine (W471) schedules counselling sessions tracked here.
 *
 * Per Phase C of v3 lifecycle (docs/blueprint/beneficiary-lifecycle-v3.md
 * §2.2 Dimension C — Family Wellbeing).
 */

const mongoose = require('mongoose');

const FamilyCounsellingSessionSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },

    // Session basics
    sessionDate: { type: Date, required: true, default: Date.now, index: true },
    scheduledFor: { type: Date }, // when planned; sessionDate captures actual
    durationMinutes: { type: Number, min: 5, max: 240, default: 60 },

    // Who attended (sensitive — store user references when registered, else names)
    counsellorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    attendees: [
      {
        role: {
          type: String,
          enum: [
            'primary_caregiver',
            'secondary_caregiver',
            'extended_family',
            'sibling',
            'beneficiary',
            'advocate',
            'social_worker',
            'case_manager',
            'cultural_officer',
          ],
        },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        // For non-registered attendees (e.g., extended family member)
        nameDisplay: { type: String, maxlength: 200 },
      },
    ],

    // What kind of session
    sessionType: {
      type: String,
      enum: [
        'crisis_intervention',
        'periodic_checkin',
        'wbci_trigger_followup',
        'sibling_support',
        'caregiver_burnout',
        'financial_consultation',
        'extended_family_meeting',
        'bereavement_support',
        'pre_transition_planning',
        'other',
      ],
      required: true,
      index: true,
    },

    // Triggers — where this session originated
    triggerSource: {
      type: String,
      enum: [
        'wbci_low_score',
        'caregiver_burden_high',
        'sibling_adjustment_low',
        'financial_stress_high',
        'family_self_requested',
        'case_manager_referral',
        'voice_log_complaint',
        'safeguarding_followup',
        'scheduled_routine',
      ],
      required: true,
    },
    triggerSnapshotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FamilyWellbeingSnapshot',
    },
    triggerVoiceLogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BeneficiaryVoiceLog',
    },

    // Session content (sensitive — stored encrypted at rest if possible)
    presentingConcerns: { type: String, maxlength: 3000 },
    interventionsApplied: [{ type: String, maxlength: 200 }],
    sessionNotes: { type: String, maxlength: 5000 },

    // Pre/post wellbeing capture for outcome tracking
    preSessionWbci: { type: Number, min: 0, max: 100 },
    postSessionConcernsAddressed: { type: Number, min: 0, max: 100 }, // 0-100% addressed

    // Actions out of session
    followUpActions: [
      {
        action: { type: String, maxlength: 500 },
        owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        dueDate: { type: Date },
        status: {
          type: String,
          enum: ['pending', 'in_progress', 'completed', 'cancelled'],
          default: 'pending',
        },
        completedAt: { type: Date },
      },
    ],
    nextSessionScheduledAt: { type: Date },

    // Cultural sensitivity flags (Phase E forward-compat)
    culturalAccommodations: [{ type: String, maxlength: 200 }],

    // Status
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'no_show', 'cancelled'],
      default: 'completed',
      index: true,
    },
    cancellationReason: { type: String, maxlength: 500 },

    // PDPL: sensitive content — short TTL for raw notes
    isSensitive: { type: Boolean, default: true },
    notesArchivedAt: { type: Date },
  },
  {
    timestamps: true,
    collection: 'family_counselling_sessions',
  }
);

FamilyCounsellingSessionSchema.index({ beneficiaryId: 1, sessionDate: -1 });
FamilyCounsellingSessionSchema.index({ branchId: 1, sessionDate: -1, sessionType: 1 });
FamilyCounsellingSessionSchema.index({ counsellorUserId: 1, sessionDate: -1 });

// W470 Wave-18 invariants (W1026: converted to async/throw style so the hook
// family stays consistent with the global async plugins → avoids the W483
// "next is not a function" Kareem promise-adapter mismatch).
FamilyCounsellingSessionSchema.pre('save', async function () {
  // W1026: flag completion transition for the post('save') emitter.
  this.$__familyCounsellingDoneNow =
    this.status === 'completed' && (this.isNew || this.isModified('status'));

  // Cancelled/no_show require cancellationReason
  if (
    (this.status === 'cancelled' || this.status === 'no_show') &&
    (!this.cancellationReason || this.cancellationReason.trim().length < 5)
  ) {
    throw new Error(
      `FamilyCounsellingSession: status="${this.status}" requires cancellationReason (≥5 chars)`
    );
  }

  // completed status: sessionDate should be in the past or now
  if (this.status === 'completed' && this.sessionDate && this.sessionDate > new Date()) {
    throw new Error(
      'FamilyCounsellingSession: completed session cannot have sessionDate in future'
    );
  }

  // followUpActions[].completed requires completedAt
  for (const fa of this.followUpActions || []) {
    if (fa.status === 'completed' && !fa.completedAt) {
      fa.completedAt = new Date();
    }
  }
});

// ── W1026: producer hook — family counselling completed → unified core ──
// Emit after the write commits; the flag is set in the pre('save') above.
FamilyCounsellingSessionSchema.post('save', function emitFamilyCounsellingDone(doc) {
  if (!this.$__familyCounsellingDoneNow) return;
  if (!doc.beneficiaryId) return;
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    if (!integrationBus || typeof integrationBus.publish !== 'function') return;
    integrationBus.publish('family-counselling', 'family_counselling.completed', {
      familyCounsellingSessionId: String(doc._id),
      beneficiaryId: String(doc.beneficiaryId),
      branchId: doc.branchId ? String(doc.branchId) : undefined,
      sessionType: doc.sessionType,
      triggerSource: doc.triggerSource,
      durationMinutes: doc.durationMinutes,
      completedAt: doc.sessionDate || new Date(),
    });
  } catch {
    /* never block the save */
  }
});

module.exports =
  mongoose.models.FamilyCounsellingSession ||
  mongoose.model('FamilyCounsellingSession', FamilyCounsellingSessionSchema);
