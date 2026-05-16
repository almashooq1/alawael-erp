/**
 * Alert — persistent record of an emitted smart-alerts finding.
 *
 * Lifecycle:
 *   - Engine emits a raised alert → dispatcher creates an Alert document.
 *   - While the condition persists, the same (ruleId, key) stays a
 *     single Alert; subsequent engine runs bump `lastSeenAt`.
 *   - When the condition clears, dispatcher sets `resolvedAt`.
 *
 * One record per (ruleId, key); uniqueness enforced at the DB level.
 *
 * Wave 11 (2026-05-16) — added optional structural fields for the
 * Alert & Priority Engine: state transitions, ownership/assignment,
 * tier-based escalation tracking, threaded comments, and re-open
 * detection. Every new field is optional, so existing Alert docs
 * stay valid and the dispatcher's current shape keeps working
 * unchanged.
 */

'use strict';

const mongoose = require('mongoose');
const { TENANT_FIELD } = require('../config/constants');

const SEVERITIES = ['info', 'warning', 'high', 'critical'];
const CATEGORIES = ['clinical', 'financial', 'operational', 'quality', 'hr', 'compliance'];

// Wave 11 — orthogonal classification axes
const ARCHETYPES = ['threshold', 'deadline', 'state', 'absence', 'anomaly', 'composite'];
const TIME_PRESSURES = ['immediate', 'hours', 'days', 'watching'];
const SCOPES = ['entity', 'branch', 'region', 'platform'];

// Wave 11 — alert lifecycle states (orthogonal to severity)
const ALERT_STATES = ['OPEN', 'ACKNOWLEDGED', 'ASSIGNED', 'SNOOZED', 'MUTED', 'RESOLVED'];

// Wave 11 — sub-schema for state transitions audit trail
const StateTransitionSchema = new mongoose.Schema(
  {
    from: { type: String, enum: ALERT_STATES, required: true },
    to: { type: String, enum: ALERT_STATES, required: true },
    at: { type: Date, default: Date.now, required: true },
    byUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    byRole: { type: String, default: null },
    reason: { type: String, default: null }, // required by route layer for mute/snooze
    ip: { type: String, default: null },
  },
  { _id: false }
);

// Wave 11 — sub-schema for threaded comments
const CommentSchema = new mongoose.Schema(
  {
    byUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    byRole: { type: String, default: null },
    text: { type: String, required: true, maxlength: 2000 },
    at: { type: Date, default: Date.now, required: true },
  },
  { _id: true } // comments DO get _id so the UI can reply / edit by id
);

// Wave 11 — sub-schema for re-open events
const ReopenSchema = new mongoose.Schema(
  {
    reopenedAt: { type: Date, default: Date.now, required: true },
    previousResolvedAt: { type: Date, default: null },
    reason: { type: String, enum: ['engine_redetected', 'manual'], default: 'engine_redetected' },
    triggeredByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false }
);

const AlertSchema = new mongoose.Schema(
  {
    ruleId: { type: String, required: true, index: true },
    key: { type: String, required: true },
    severity: { type: String, enum: SEVERITIES, required: true, index: true },
    category: { type: String, enum: CATEGORIES, index: true },
    description: { type: String, required: true },
    message: { type: String, required: true },

    // Wave 11 — orthogonal classification axes (optional; rules may set them)
    archetype: { type: String, enum: ARCHETYPES, default: null },
    timePressure: { type: String, enum: TIME_PRESSURES, default: null, index: true },
    scope: { type: String, enum: SCOPES, default: null, index: true },

    subject: {
      type: {
        type: { type: String }, // resource type
        id: { type: mongoose.Schema.Types.Mixed },
      },
      _id: false,
    },

    [TENANT_FIELD]: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },

    firstSeenAt: { type: Date, default: Date.now, required: true },
    lastSeenAt: { type: Date, default: Date.now, required: true },
    resolvedAt: { type: Date, default: null, index: true },

    // ── Wave 11 — Workflow state ──────────────────────────────
    // `state.current` is the derived state; the dispatcher / coordinator
    // updates it whenever `transitions` gains an entry. Defaults to
    // 'OPEN' for new alerts so legacy reads don't crash.
    state: {
      current: { type: String, enum: ALERT_STATES, default: 'OPEN', index: true },
      transitions: { type: [StateTransitionSchema], default: [] },
    },

    // ── Wave 11 — Assignment ───────────────────────────────────
    // Set when a specific user takes ownership. Once assigned, tier
    // broadcast stops and notifications are routed only to this user.
    ownership: {
      assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
      assignedAt: { type: Date, default: null },
      assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },

    // ── Wave 11 — Escalation tier tracking ─────────────────────
    // The escalation coordinator (Wave 13) reads / writes these on
    // its periodic tick. Tier 1 is the default. tier{N}NotifiedRoles
    // captures who was paged at each step for the audit trail.
    escalation: {
      currentTier: { type: Number, min: 1, max: 3, default: 1, index: true },
      tier1At: { type: Date, default: Date.now },
      tier2At: { type: Date, default: null },
      tier3At: { type: Date, default: null },
      tier2NotifiedRoles: { type: [String], default: [] },
      tier3NotifiedRoles: { type: [String], default: [] },
    },

    // ── Wave 11 — Ack / Snooze / Mute (consolidated) ───────────
    // `ackedAt` / `snoozeUntil` / `mutedUntil` already existed on
    // dashboardAlertCoordinator's in-memory ActiveAlert; promoting
    // them here lets the persisted Alert speak for itself.
    ackedAt: { type: Date, default: null, index: true },
    ackedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    snoozeUntil: { type: Date, default: null, index: true },
    mutedUntil: { type: Date, default: null, index: true },
    muteReason: { type: String, default: null },

    // ── Wave 11 — Manual resolve metadata ──────────────────────
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolveNote: { type: String, default: null },

    // ── Wave 11 — Threaded comments ────────────────────────────
    comments: { type: [CommentSchema], default: [] },

    // ── Wave 11 — Re-open history ──────────────────────────────
    reopens: { type: [ReopenSchema], default: [] },

    notificationsSent: [
      {
        channel: { type: String, enum: ['email', 'sms', 'whatsapp', 'in_app', 'push'] },
        sentAt: { type: Date },
        recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        success: { type: Boolean },
        error: { type: String },
      },
    ],

    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: 'alerts' }
);

AlertSchema.index({ ruleId: 1, key: 1 }, { unique: true });
AlertSchema.index({ resolvedAt: 1, severity: 1 });
// Wave 11 — accelerates the "active for me / for my branch" queries
// each role-aware dashboard runs on every load. Compound order
// (state, branch, severity) follows the most-selective-first rule
// — `state.current` filters out the bulk (most alerts resolve).
AlertSchema.index({ 'state.current': 1, [TENANT_FIELD]: 1, severity: 1 });
AlertSchema.index({ 'ownership.assignedTo': 1, 'state.current': 1 });
AlertSchema.index({ 'escalation.currentTier': 1, severity: 1, resolvedAt: 1 });

AlertSchema.methods.isResolved = function () {
  return !!this.resolvedAt;
};

// Wave 11 — convenience: derive the visible state given current fields.
// Useful for legacy alert documents that pre-date `state.current`.
AlertSchema.methods.deriveState = function () {
  if (this.resolvedAt) return 'RESOLVED';
  if (this.mutedUntil && this.mutedUntil > new Date()) return 'MUTED';
  if (this.snoozeUntil && this.snoozeUntil > new Date()) return 'SNOOZED';
  if (this.ownership && this.ownership.assignedTo) return 'ASSIGNED';
  if (this.ackedAt) return 'ACKNOWLEDGED';
  return 'OPEN';
};

AlertSchema.statics.findActive = function (filter = {}) {
  return this.find({ ...filter, resolvedAt: null });
};

// Wave 11 — find alerts owned by a user (assigned to them, or in
// their fallback chain). Used by `/api/parent-v2/...` and the
// dashboard role-aware filters in Wave 14.
AlertSchema.statics.findAssignedTo = function (userId) {
  return this.find({
    'ownership.assignedTo': userId,
    'state.current': { $nin: ['RESOLVED'] },
  });
};

module.exports = {
  AlertSchema,
  SEVERITIES,
  CATEGORIES,
  ARCHETYPES,
  TIME_PRESSURES,
  SCOPES,
  ALERT_STATES,
  get model() {
    return mongoose.models.Alert || mongoose.model('Alert', AlertSchema);
  },
};
