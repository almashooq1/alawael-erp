'use strict';

/**
 * ComplianceCalendarEvent — Phase 13 Commit 3 (4.0.57).
 *
 * Persistent row in the unified compliance calendar. Covers:
 *
 *   • Manual / regulatory deadlines (e.g. "file annual MOH report
 *     by 2026-05-31") that don't originate in any other module.
 *
 *   • Snapshot of a computed event that the operator has since
 *     acted on — e.g. they resolved a credential expiry by
 *     uploading the renewed license. The service persists the
 *     resolution here so the audit trail survives even if the
 *     upstream credential record is later mutated.
 *
 * Read-only computed events (from adapters like EvidenceItem
 * expiry) are NOT persisted here — they're merged into the
 * calendar view at query time.
 */

const mongoose = require('mongoose');
const {
  CALENDAR_EVENT_TYPES,
  CALENDAR_EVENT_STATUSES,
  CALENDAR_SEVERITIES,
  SOURCE_ADAPTERS,
} = require('../../config/compliance-calendar.registry');

// ── sub-schemas ────────────────────────────────────────────────────

const sourceRefSchema = new mongoose.Schema(
  {
    adapter: { type: String, enum: SOURCE_ADAPTERS, required: true },
    collection: { type: String, default: null },
    docId: { type: mongoose.Schema.Types.ObjectId, default: null },
    externalId: { type: String, default: null },
  },
  { _id: false, suppressReservedKeysWarning: true }
);

const alertLogEntrySchema = new mongoose.Schema(
  {
    window: { type: Number, required: true }, // days ahead of due (e.g. 30, 7, 0)
    firedAt: { type: Date, required: true },
    channel: { type: String, default: null },
  },
  { _id: false }
);

const resolutionSchema = new mongoose.Schema(
  {
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
    evidenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'EvidenceItem', default: null },
    notes: { type: String, default: null },
  },
  { _id: false }
);

// ── main schema ────────────────────────────────────────────────────

const calendarEventSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, required: true }, // CC-YYYY-NNNNNN

    title: { type: String, required: true, trim: true },
    description: { type: String, default: null },

    type: { type: String, enum: CALENDAR_EVENT_TYPES, required: true },
    severity: { type: String, enum: CALENDAR_SEVERITIES, default: 'info' },

    dueDate: { type: Date, required: true, index: true },
    windowStart: { type: Date, default: null }, // for events with a window (e.g. inspection)
    windowEnd: { type: Date, default: null },

    status: {
      type: String,
      enum: CALENDAR_EVENT_STATUSES,
      default: 'upcoming',
      index: true,
    },

    // Regulatory linkage
    regulationRefs: {
      type: [
        new mongoose.Schema(
          {
            standard: { type: String, required: true },
            clause: { type: String, required: true },
          },
          { _id: false }
        ),
      ],
      default: [],
    },

    // Source (optional — manual events have adapter='manual')
    source: {
      type: sourceRefSchema,
      default: () => ({ adapter: 'manual' }),
    },

    // Ownership
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    ownerRole: { type: String, default: null },

    // Escalation trail
    alertsFired: { type: [alertLogEntrySchema], default: [] },

    // Resolution
    resolution: { type: resolutionSchema, default: () => ({}) },

    // Snoozing
    snoozedUntil: { type: Date, default: null },
    snoozeReason: { type: String, default: null },

    // Cancellation
    cancelledReason: { type: String, default: null },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    cancelledAt: { type: Date, default: null },

    // Scope
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null },

    tags: { type: [String], default: [] },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

// ── indexes ────────────────────────────────────────────────────────

calendarEventSchema.index({ branchId: 1, status: 1, dueDate: 1 });
calendarEventSchema.index({ type: 1, dueDate: 1 });
calendarEventSchema.index({ 'source.adapter': 1, 'source.docId': 1 });
calendarEventSchema.index({ severity: 1, status: 1, dueDate: 1 });
calendarEventSchema.index({ deleted_at: 1 });

// ── auto-numbering ─────────────────────────────────────────────────

calendarEventSchema.pre('validate', async function () {
  if (this.code) return;
  const year = (this.dueDate || new Date()).getUTCFullYear();
  const Model = mongoose.model('ComplianceCalendarEvent');
  const count = await Model.countDocuments({ code: { $regex: `^CC-${year}-` } });
  this.code = `CC-${year}-${String(count + 1).padStart(6, '0')}`;
});

// ── virtuals ───────────────────────────────────────────────────────

calendarEventSchema.virtual('isTerminal').get(function () {
  return ['resolved', 'cancelled'].includes(this.status);
});

calendarEventSchema.set('toJSON', { virtuals: true });
calendarEventSchema.set('toObject', { virtuals: true });

// ── export ─────────────────────────────────────────────────────────

const ComplianceCalendarEvent =
  mongoose.models.ComplianceCalendarEvent ||
  mongoose.model('ComplianceCalendarEvent', calendarEventSchema);

module.exports = ComplianceCalendarEvent;
