'use strict';

/**
 * CrisisIncident — W458.
 *
 * Unified crisis-event orchestrator entity. Sits ABOVE the specialized
 * incident models (W356 SeizureEvent + W357 SafeguardingConcern) and
 * coordinates response across them. Designed so that a SeizureEvent
 * created via its own surface automatically creates a CrisisIncident
 * shadow via the W458 orchestrator service.
 *
 * Crisis types (6 canonical):
 *   medical_seizure  — W356 SeizureEvent linked
 *   medical_other    — choking, fall, allergic reaction
 *   behavioral       — aggression, self-injury, elopement
 *   safeguarding     — W357 SafeguardingConcern linked
 *   family           — caregiver death, custody change, sudden poverty
 *   environmental    — sandstorm closure, transportation failure
 *   system           — data breach, service outage
 *
 * Severity tiers drive SLA + automatic post-incident review:
 *   critical  → response < 30 min, MDT review required within 24h
 *   urgent    → response < 4h, post-incident review within 72h
 *   concerning → response same day, review within 7 days
 *   minor     → response within 24h, no formal review needed
 *
 * Per Phase A Dimension F (Crisis Readiness) of v3 lifecycle.
 */

const mongoose = require('mongoose');

const EscalationActionSchema = new mongoose.Schema(
  {
    actionType: {
      type: String,
      enum: [
        'caregiver_notified',
        'physician_called',
        'emergency_services_called',
        'safeguarding_lead_notified',
        'case_manager_notified',
        'branch_manager_notified',
        'rescue_protocol_initiated',
        'hospital_transport_initiated',
        'authority_reported',
        'family_notified',
        'other',
      ],
      required: true,
    },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    performedAt: { type: Date, default: Date.now },
    outcome: {
      type: String,
      enum: ['success', 'failed', 'pending', 'unknown'],
      default: 'pending',
    },
    notes: { type: String, maxlength: 1000 },
  },
  { _id: false }
);

const CrisisIncidentSchema = new mongoose.Schema(
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

    crisisType: {
      type: String,
      enum: [
        'medical_seizure',
        'medical_other',
        'behavioral',
        'safeguarding',
        'family',
        'environmental',
        'system',
      ],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['critical', 'urgent', 'concerning', 'minor'],
      required: true,
      index: true,
    },

    occurredAt: { type: Date, required: true, index: true },
    reportedAt: { type: Date, default: Date.now },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Link to specialized entity (one or the other; both null is OK)
    seizureEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'SeizureEvent', index: true },
    safeguardingConcernId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SafeguardingConcern',
      index: true,
    },

    // Response tracking
    emergencyPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmergencyPlan' },
    escalationActions: { type: [EscalationActionSchema], default: () => [] },

    // Post-incident
    postIncidentReviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'CapaItem' },
    rcaTriggered: { type: Boolean, default: false },
    rcaCompletedAt: { type: Date },

    status: {
      type: String,
      enum: ['active', 'resolved', 'escalated', 'under_review', 'closed'],
      default: 'active',
      index: true,
    },
    resolvedAt: { type: Date },
    closedAt: { type: Date },

    description: { type: String, maxlength: 2000 },
    correlationId: { type: String, maxlength: 100, index: true },
  },
  {
    timestamps: true,
    collection: 'crisis_incidents',
  }
);

// Indexes for common query patterns
CrisisIncidentSchema.index({ branchId: 1, occurredAt: -1, severity: 1 });
CrisisIncidentSchema.index({ beneficiaryId: 1, occurredAt: -1 });
CrisisIncidentSchema.index({ status: 1, severity: 1 });

// Wave-18 invariant: status closed/resolved requires resolvedAt / closedAt
// W494: callback → async.
CrisisIncidentSchema.pre('save', async function () {
  if ((this.status === 'resolved' || this.status === 'closed') && !this.resolvedAt) {
    this.resolvedAt = new Date();
  }
  if (this.status === 'closed' && !this.closedAt) {
    this.closedAt = new Date();
  }
});

// W1004 — surface acute crises on the unified-core timeline. A CrisisIncident
// (acute behavioral/psychiatric/medical/safeguarding crisis with its own
// active→resolved/closed lifecycle) is distinct from the W977 safety events
// (seizure/safeguarding/restraint) and the W970 behavior incident — it needs its
// own reported/resolved timeline entry. Native pre-compile hooks per the W970
// pattern; guarded + fire-and-forget. W954-SAFE signatures (post(doc) / 0-param) —
// coexist with the existing async 0-param pre('save') (different event). Create
// is detected via post('init') NOT having run (a fresh instance) — CrisisIncident
// is always created as a new instance (report route) and mutated via a hydrated
// instance (escalate/close routes), so this is reliable here.
CrisisIncidentSchema.post('init', function () {
  this.$__prevStatus = this.status;
});
CrisisIncidentSchema.post('save', function (doc) {
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    if (!integrationBus || typeof integrationBus.publish !== 'function') return;
    if (!doc.beneficiaryId) return;
    const base = {
      crisisId: String(doc._id),
      beneficiaryId: String(doc.beneficiaryId),
      crisisType: doc.crisisType || '',
      crisisSeverity: doc.severity || '',
    };
    const created = doc.$__prevStatus === undefined; // post('init') didn't run → new
    const isTerminal = doc.status === 'resolved' || doc.status === 'closed';
    const wasTerminal =
      doc.$__prevStatus === 'resolved' || doc.$__prevStatus === 'closed';
    if (created) {
      Promise.resolve(integrationBus.publish('crisis', 'crisis.reported', base)).catch(() => {});
    } else if (isTerminal && !wasTerminal) {
      Promise.resolve(integrationBus.publish('crisis', 'crisis.resolved', base)).catch(() => {});
    }
  } catch (_) {
    /* bus not wired — never block persistence */
  }
});

module.exports =
  mongoose.models.CrisisIncident || mongoose.model('CrisisIncident', CrisisIncidentSchema);
