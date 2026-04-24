'use strict';

/**
 * SLA.model.js — Phase 16 Commit 1 (4.0.66).
 *
 * Runtime SLA instance. One document per (policyId, subject) pair —
 * where subject is whatever artifact the SLA is watching (ticket,
 * work order, purchase request, appointment, session, trip, meeting
 * decision, correspondence).
 *
 * Why a dedicated instance model instead of stamping fields on each
 * subject collection:
 *
 *   1. **Cross-module uniformity** — the engine walks a single
 *      collection to find candidates near/over target; it does not
 *      need to know the shape of every subject model.
 *
 *   2. **Audit trail** — response/resolution timestamps, pause
 *      windows, and the final breach state are all preserved even if
 *      the subject is deleted or soft-closed.
 *
 *   3. **Replays** — when policy targets change (e.g. CBAHI tightens
 *      response SLA from 60→30min), we don't rewrite history; we keep
 *      the snapshot of the targets at activation-time.
 *
 *   4. **Testability** — invariants live in the service layer, the
 *      schema just persists state. Easy to unit-test.
 *
 * Lifecycle states:
 *
 *   active   → clock running
 *   paused   → subject entered a pauseOnStates state; clock frozen
 *   met      → resolved before target
 *   breached → crossed resolution target (warning crossed earlier too)
 *   cancelled → subject cancelled; SLA closed with no outcome
 */

const mongoose = require('mongoose');
const { OPS_MODULES } = require('../../config/sla.registry');

const SLA_STATUSES = Object.freeze(['active', 'paused', 'met', 'breached', 'cancelled']);

const pauseWindowSchema = new mongoose.Schema(
  {
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, default: null }, // null while still paused
    reason: { type: String, default: null }, // state name that caused pause
  },
  { _id: false }
);

const escalationFiredSchema = new mongoose.Schema(
  {
    stepIndex: { type: Number, required: true },
    afterMinutes: { type: Number, required: true },
    firedAt: { type: Date, required: true },
    notifiedRoles: { type: [String], default: [] },
  },
  { _id: false }
);

const targetsSnapshotSchema = new mongoose.Schema(
  {
    responseTargetMinutes: { type: Number, default: 0 },
    resolutionTargetMinutes: { type: Number, required: true },
    warnAtPct: { type: Number, default: 80 },
    businessHoursOnly: { type: Boolean, default: false },
  },
  { _id: false }
);

const slaSchema = new mongoose.Schema(
  {
    // ── identity ────────────────────────────────────────────────
    policyId: { type: String, required: true, index: true }, // SLA.registry id
    module: { type: String, enum: OPS_MODULES, required: true, index: true },
    severity: { type: String, required: true, index: true },

    // ── subject linkage ─────────────────────────────────────────
    // Subject is abstract — the engine doesn't care about ref; it
    // just needs enough to re-find the document for state sync.
    subjectType: { type: String, required: true, index: true }, // e.g. 'HelpDeskTicket'
    subjectId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    subjectRef: { type: String, default: null }, // human-friendly ref (TKT-2026-0001)

    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },

    // ── clock ────────────────────────────────────────────────────
    startedAt: { type: Date, required: true, index: true },
    firstResponseAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },

    pauseWindows: { type: [pauseWindowSchema], default: [] },
    totalPausedMs: { type: Number, default: 0 }, // memoised sum of closed windows

    // ── targets (snapshot at creation time) ─────────────────────
    targets: { type: targetsSnapshotSchema, required: true },

    // ── state ────────────────────────────────────────────────────
    status: { type: String, enum: SLA_STATUSES, default: 'active', index: true },
    responseBreached: { type: Boolean, default: false },
    resolutionBreached: { type: Boolean, default: false },
    warningFired: { type: Boolean, default: false },

    // ── escalation history (idempotent firing) ──────────────────
    escalationHistory: { type: [escalationFiredSchema], default: [] },

    // ── audit ────────────────────────────────────────────────────
    lastCheckedAt: { type: Date, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// ── indexes ─────────────────────────────────────────────────────────

slaSchema.index({ status: 1, startedAt: 1 });
slaSchema.index({ module: 1, severity: 1, status: 1 });
slaSchema.index({ subjectType: 1, subjectId: 1, policyId: 1 }, { unique: true });

// ── virtuals ────────────────────────────────────────────────────────

/**
 * Elapsed active time in ms (excludes paused windows).
 * Use `now` param so tests can be deterministic.
 */
slaSchema.methods.elapsedActiveMs = function (now = new Date()) {
  const end = this.resolvedAt || this.cancelledAt || now;
  const total = end.getTime() - this.startedAt.getTime();

  // Sum all paused windows (closed) + any currently-open window
  let paused = this.totalPausedMs || 0;
  const openWindow = this.pauseWindows.find(w => !w.endedAt);
  if (openWindow) {
    paused += now.getTime() - openWindow.startedAt.getTime();
  }
  return Math.max(0, total - paused);
};

slaSchema.methods.percentOfTarget = function (now = new Date()) {
  const elapsedMin = this.elapsedActiveMs(now) / 60000;
  const target = this.targets.resolutionTargetMinutes || 1;
  return Math.round((elapsedMin / target) * 10000) / 100; // 2dp
};

slaSchema.methods.isNearBreach = function (now = new Date()) {
  return this.status === 'active' && this.percentOfTarget(now) >= this.targets.warnAtPct;
};

slaSchema.methods.isBreached = function (now = new Date()) {
  return this.status === 'active' && this.percentOfTarget(now) >= 100;
};

slaSchema.set('toJSON', { virtuals: true });
slaSchema.set('toObject', { virtuals: true });

// ── export ──────────────────────────────────────────────────────────

const SLA = mongoose.models.SLA || mongoose.model('SLA', slaSchema);

module.exports = SLA;
module.exports.SLA_STATUSES = SLA_STATUSES;
