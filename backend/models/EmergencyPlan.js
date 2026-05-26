'use strict';

/**
 * EmergencyPlan — W458.
 *
 * Per-beneficiary crisis preparedness plan. Lists known conditions,
 * escalation chain (who calls whom in what order), evacuation plan,
 * hospital preference, emergency contacts. Reviewed every N months
 * (default 6).
 *
 * Used by the CrisisOrchestrator (W458) when a crisis is reported:
 *   1. Look up EmergencyPlan(beneficiaryId)
 *   2. Walk escalationChain in order, invoking contactMethod handlers
 *   3. Record actions taken in CrisisIncident.escalationActions
 *
 * Per Phase A Crisis pathway (docs/blueprint/beneficiary-lifecycle-v3.md
 * §2.2 Dimension F) — orchestration layer over existing W356 SeizureEvent
 * + W357 SafeguardingConcern (those keep their specialized workflows).
 */

const mongoose = require('mongoose');

const KnownConditionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['seizure', 'allergy', 'cardiac', 'behavioral', 'respiratory', 'medical-other'],
      required: true,
    },
    description: { type: String, maxlength: 500 },
    triggers: [{ type: String, maxlength: 200 }],
    rescueProtocol: { type: String, maxlength: 2000 },
    rescueMedications: [{ type: String, maxlength: 100 }],
  },
  { _id: false }
);

const EscalationStepSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true, min: 1, max: 20 },
    role: {
      type: String,
      enum: [
        'caregiver',
        'physician',
        'safeguarding_lead',
        'emergency_services',
        'case_manager',
        'branch_manager',
        'social_worker',
      ],
      required: true,
    },
    contactMethod: {
      type: String,
      enum: ['phone', 'app_notification', 'whatsapp', 'email', 'sms', 'on_site'],
      required: true,
    },
    contactDetailsEncrypted: { type: String, maxlength: 500 }, // encrypted PII
    activationConditions: { type: String, maxlength: 300 },
  },
  { _id: false }
);

const EmergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 200 },
    relationship: { type: String, maxlength: 100 },
    phoneEncrypted: { type: String, maxlength: 300 },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false }
);

const EmergencyPlanSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      unique: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },

    knownConditions: { type: [KnownConditionSchema], default: () => [] },
    escalationChain: { type: [EscalationStepSchema], default: () => [] },

    evacuationPlan: { type: String, maxlength: 2000 },
    hospitalPreference: { type: String, maxlength: 200 },
    emergencyContacts: { type: [EmergencyContactSchema], default: () => [] },

    lastReviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewCadenceMonths: { type: Number, default: 6, min: 1, max: 24 },
    nextReviewDue: { type: Date, index: true },

    status: {
      type: String,
      enum: ['draft', 'active', 'archived'],
      default: 'active',
      index: true,
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'emergency_plans',
  }
);

// Wave-18 invariant: at most ONE primary emergency contact.
EmergencyPlanSchema.pre('save', function (next) {
  if (Array.isArray(this.emergencyContacts)) {
    const primaries = this.emergencyContacts.filter(c => c.isPrimary === true);
    if (primaries.length > 1) {
      return next(
        new Error('EmergencyPlan.emergencyContacts: at most one contact may have isPrimary: true')
      );
    }
  }

  // Auto-fill nextReviewDue from lastReviewedAt + cadence
  if (this.lastReviewedAt && !this.nextReviewDue) {
    const months = this.reviewCadenceMonths || 6;
    const next = new Date(this.lastReviewedAt);
    next.setMonth(next.getMonth() + months);
    this.nextReviewDue = next;
  }

  next();
});

module.exports =
  mongoose.models.EmergencyPlan || mongoose.model('EmergencyPlan', EmergencyPlanSchema);
