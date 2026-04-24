'use strict';

/**
 * Lead.model.js — Phase 17 Commit 1 (4.0.83) — the `CareLead` model.
 *
 * A prospect who's been validated as a real opportunity (either
 * direct walk-in or promoted from an Inquiry). Carries the full
 * acquisition funnel state plus two SLA backlinks:
 *
 *   • `firstResponseSlaId` — `crm.lead.first_response` (4h resolution)
 *   • `conversionSlaId`   — `crm.lead.conversion` (14-day window,
 *     pauses on `awaiting_guardian_callback` + `awaiting_documents`)
 *
 * Why the model is called `CareLead` (and not replacing `CrmLead`):
 *   The legacy `CrmLead` has been in production for a while; it's
 *   referenced by analytics dashboards and legacy routes. This
 *   model ships alongside it — the two can coexist, and callers
 *   migrate on their own timeline. The collection name
 *   `care_leads` avoids collision.
 */

const mongoose = require('mongoose');
const { LEAD_STATUSES, REFERRAL_SOURCES, LOST_REASONS } = require('../../config/care/crm.registry');

const statusHistorySchema = new mongoose.Schema(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
    event: { type: String, required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    at: { type: Date, required: true, default: Date.now },
    notes: { type: String, default: null },
  },
  { _id: false }
);

const activityLogEntrySchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ['call', 'email', 'sms', 'whatsapp', 'meeting', 'note', 'system'],
      required: true,
    },
    summary: { type: String, required: true },
    detail: { type: String, default: null },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorNameSnapshot: { type: String, default: null },
    at: { type: Date, required: true, default: Date.now },
    outcome: {
      type: String,
      enum: [
        'answered',
        'no_answer',
        'voicemail',
        'callback_requested',
        'confirmed',
        'declined',
        null,
      ],
      default: null,
    },
  },
  { _id: true }
);

const leadSchema = new mongoose.Schema(
  {
    leadNumber: { type: String, required: true, unique: true, uppercase: true },

    // ── origin ──────────────────────────────────────────────────
    sourceInquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inquiry',
      default: null,
      index: true,
    },
    referralSource: { type: String, enum: REFERRAL_SOURCES, default: 'direct_walk_in' },
    referralPartnerName: { type: String, default: null }, // for MoH / charity / hospital name
    campaignTag: { type: String, default: null },

    // ── guardian / contact ──────────────────────────────────────
    guardianName: { type: String, required: true, trim: true },
    guardianPhone: { type: String, required: true },
    guardianEmail: { type: String, default: null },
    guardianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guardian',
      default: null,
      index: true,
    },
    preferredContactMethod: {
      type: String,
      enum: ['phone', 'email', 'whatsapp', 'sms'],
      default: 'phone',
    },

    // ── prospective beneficiary ─────────────────────────────────
    beneficiaryName: { type: String, required: true },
    beneficiaryAgeYears: { type: Number, default: null, min: 0 },
    condition: { type: String, default: null },
    preferredBranchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },

    // ── state machine ───────────────────────────────────────────
    status: {
      type: String,
      enum: LEAD_STATUSES,
      default: 'new',
      index: true,
    },
    statusHistory: { type: [statusHistorySchema], default: [] },

    // ── qualification + interest ───────────────────────────────
    qualificationScore: { type: Number, default: null, min: 0, max: 100 },
    qualificationNotes: { type: String, default: null },

    // ── assessment scheduling ───────────────────────────────────
    assessmentAt: { type: Date, default: null }, // filled when entering assessment_scheduled
    assessmentAppointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },

    // ── conversion outcome ─────────────────────────────────────
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      default: null,
      index: true,
    },
    convertedAt: { type: Date, default: null },
    convertedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // ── lost/cancellation ───────────────────────────────────────
    lostReason: { type: String, enum: [...LOST_REASONS, null], default: null },
    lostDetail: { type: String, default: null },
    cancelledAt: { type: Date, default: null },

    // ── SLA backlinks ───────────────────────────────────────────
    firstResponseSlaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SLA',
      default: null,
      index: true,
    },
    conversionSlaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SLA',
      default: null,
      index: true,
    },
    firstResponseAt: { type: Date, default: null },

    // ── ownership ──────────────────────────────────────────────
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    ownerNameSnapshot: { type: String, default: null },

    // ── activity timeline (append-only) ────────────────────────
    activity: { type: [activityLogEntrySchema], default: [] },

    // ── misc ────────────────────────────────────────────────────
    tags: { type: [String], default: [] },
    notes: { type: String, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true, collection: 'care_leads' }
);

// ── indexes ─────────────────────────────────────────────────────────
leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({ ownerUserId: 1, status: 1 });
leadSchema.index({ referralSource: 1, status: 1 });
leadSchema.index({ preferredBranchId: 1, status: 1 });

// ── auto-numbering LEAD-YYYY-NNNNN ──────────────────────────────────
leadSchema.pre('validate', async function () {
  if (this.leadNumber) return;
  const year = (this.createdAt || new Date()).getUTCFullYear();
  const Model = mongoose.model('CareLead');
  const count = await Model.countDocuments({
    leadNumber: { $regex: `^LEAD-${year}-` },
  });
  this.leadNumber = `LEAD-${year}-${String(count + 1).padStart(5, '0')}`;
});

// ── virtuals ────────────────────────────────────────────────────────
leadSchema.virtual('ageDays').get(function () {
  return Math.floor((Date.now() - this.createdAt.getTime()) / 86400000);
});

leadSchema.virtual('isTerminal').get(function () {
  return ['converted', 'lost', 'cancelled'].includes(this.status);
});

leadSchema.set('toJSON', { virtuals: true });
leadSchema.set('toObject', { virtuals: true });

// Exported as `CareLead` so the existing `CrmLead` legacy model keeps working.
const CareLead = mongoose.models.CareLead || mongoose.model('CareLead', leadSchema);

module.exports = CareLead;
