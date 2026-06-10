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

// ── W1055: unified-core linkage ───────────────────────────────────────
// On resolution (status → 'resolved'/'closed'), publish crisis_incident.resolved
// so the cross-module subscriber records a milestone on the beneficiary's
// CareTimeline. NON-callback hooks only (matches the async pre('save') above).
CrisisIncidentSchema.pre('save', function () {
  const resolving = this.status === 'resolved' || this.status === 'closed';
  this.$__crisisResolvedNow = resolving && (this.isNew || this.isModified('status'));
});

function emitCrisisIncidentResolved(doc) {
  if (!doc || !doc.$__crisisResolvedNow) return;
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    integrationBus.publish('crisis-incident', 'crisis_incident.resolved', {
      incidentId: String(doc._id),
      beneficiaryId: doc.beneficiaryId ? String(doc.beneficiaryId) : null,
      ...(doc.branchId ? { branchId: String(doc.branchId) } : {}),
      crisisType: doc.crisisType,
      severity: doc.severity,
      resolvedAt: doc.resolvedAt || doc.updatedAt,
    });
  } catch (_err) {
    /* bus optional — never block the write */
  }
}

CrisisIncidentSchema.post('save', emitCrisisIncidentResolved);

module.exports =
  mongoose.models.CrisisIncident || mongoose.model('CrisisIncident', CrisisIncidentSchema);
