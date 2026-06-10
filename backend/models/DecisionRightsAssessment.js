'use strict';

/**
 * DecisionRightsAssessment — W461.
 *
 * Per-decision capacity assessment + routing snapshot. Implements the
 * v3 Decision Rights Matrix (CRPD Article 12 supported decision-making)
 * — capacity is assessed PER DECISION, not blanket.
 *
 * Created at major decision points (medication change, restraint use,
 * research participation, plan change, transition between care levels).
 * Snapshot frozen at decision time; future decisions re-assess.
 *
 * Per Phase B of docs/blueprint/beneficiary-lifecycle-v3.md §7.
 */

const mongoose = require('mongoose');

const DecisionRightsAssessmentSchema = new mongoose.Schema(
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

    // Which decision are we assessing capacity for?
    decisionType: {
      type: String,
      enum: [
        'daily_preferences',
        'therapy_participation',
        'plan_change',
        'medication_change',
        'restraint',
        'seclusion',
        'research_consent',
        'complaint',
        'transition_intensity',
        'discharge',
        'data_sharing',
        'other',
      ],
      required: true,
      index: true,
    },
    decisionDescription: { type: String, maxlength: 1000 },

    // Capacity per the 4-criterion framework (0-3 each)
    capacity: {
      understanding: { type: Number, min: 0, max: 3, required: true },
      retention: { type: Number, min: 0, max: 3, required: true },
      weighing: { type: Number, min: 0, max: 3, required: true },
      communication: { type: Number, min: 0, max: 3, required: true },
    },

    // Computed via decision-rights.lib at save time
    compositeScore: { type: Number, min: 0, max: 12 },
    routedLayer: {
      type: String,
      enum: ['autonomy', 'supported', 'substituted', 'emergency'],
      index: true,
    },

    // Support arrangement (Layer 2+ requires)
    supportArrangement: { type: String, maxlength: 2000 },
    advocateInvolved: { type: Boolean, default: false },
    advocateUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Outcome
    decisionOutcome: { type: String, maxlength: 2000 },
    decisionMadeBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    decisionMadeAt: { type: Date },

    // Assessor
    assessedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assessedByRole: {
      type: String,
      enum: ['physician', 'psychologist', 'case_manager', 'advocate', 'mdt'],
      required: true,
    },
    assessmentInstrument: { type: String, maxlength: 200 }, // e.g., 'MacCAT-T', 'ACE-R', 'custom'
    assessedAt: { type: Date, default: Date.now, index: true },

    // Review (capacity may change — schedule next look)
    nextReviewDue: { type: Date },

    status: {
      type: String,
      enum: ['draft', 'finalized', 'superseded'],
      default: 'draft',
      index: true,
    },
    supersededBy: { type: mongoose.Schema.Types.ObjectId, ref: 'DecisionRightsAssessment' },

    notes: { type: String, maxlength: 2000 },
  },
  {
    timestamps: true,
    collection: 'decision_rights_assessments',
  }
);

DecisionRightsAssessmentSchema.index({ beneficiaryId: 1, assessedAt: -1 });
DecisionRightsAssessmentSchema.index({ beneficiaryId: 1, decisionType: 1, status: 1 });
DecisionRightsAssessmentSchema.index({ branchId: 1, routedLayer: 1, assessedAt: -1 });

// W461 Wave-18 invariants — compute composite + route layer + enforce
// support arrangement on Layer 2/3 + advocate involvement on Layer 3 +
// research-consent/restraint/seclusion.
DecisionRightsAssessmentSchema.pre('save', async function () {
  const lib = require('../intelligence/decision-rights.lib');

  // Always recompute composite + layer from capacity scores
  this.compositeScore = lib.compositeScore(this.capacity);
  const route = lib.routeDecision(this.capacity);
  this.routedLayer = route.layer;

  // Layer 2/3 requires supportArrangement
  if (
    (this.routedLayer === 'supported' || this.routedLayer === 'substituted') &&
    this.status === 'finalized' &&
    (!this.supportArrangement || this.supportArrangement.trim().length < 20)
  ) {
    throw new Error(
        `DecisionRightsAssessment: ${this.routedLayer} layer requires supportArrangement (≥20 chars) before finalization`
      );
  }

  // Decisions that always require advocate involvement regardless of layer
  if (lib.requiresAdvocate(this.decisionType, this.routedLayer)) {
    if (this.status === 'finalized' && !this.advocateInvolved) {
      throw new Error(
          `DecisionRightsAssessment: decisionType="${this.decisionType}" or layer="${this.routedLayer}" requires advocateInvolved=true before finalization`
        );
    }
  }

  
});

// ── Unified-core linkage (W1120 — decision-rights assessment island → CareTimeline) ──
DecisionRightsAssessmentSchema.post('init', function () {
  this.$__prevStatus = this.status;
});
DecisionRightsAssessmentSchema.post('save', function (doc) {
  try {
    if (doc.status !== 'finalized' || this.$__prevStatus === 'finalized') return;
    const { integrationBus } = require('../integration/systemIntegrationBus');
    if (!integrationBus || typeof integrationBus.publish !== 'function' || !doc.beneficiaryId) return;
    Promise.resolve(
      integrationBus.publish('decision-rights', 'assessment.finalized', {
        decisionRightsAssessmentId: String(doc._id),
        beneficiaryId: String(doc.beneficiaryId),
        decisionType: doc.decisionType,
      })
    ).catch(() => {});
  } catch (_) {
    /* never block persistence */
  }
});

module.exports =
  mongoose.models.DecisionRightsAssessment ||
  mongoose.model('DecisionRightsAssessment', DecisionRightsAssessmentSchema);
