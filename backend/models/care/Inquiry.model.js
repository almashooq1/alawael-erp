'use strict';

/**
 * Inquiry.model.js — Phase 17 Commit 1 (4.0.83).
 *
 * Lightweight entry-point for every inbound CRM touch. Most
 * inquiries never make it to Lead status — they're quick questions,
 * information requests, or spam. Promoting every inquiry to Lead
 * pollutes conversion metrics and wastes sales effort.
 *
 * Why separate from Lead:
 *
 *   1. **Accurate funnel math.** `Lead / Inquiry` conversion rate
 *      is a KPI — can't compute if inquiries auto-become Leads.
 *
 *   2. **Lower friction for CRM team.** Acknowledge + close is a
 *      common path; full Lead workflow would be overkill.
 *
 *   3. **Channel attribution.** Every channel lands here first —
 *      phone / website / WhatsApp / social — so channel ROI is
 *      measured at the right layer.
 *
 *   4. **SLA separation.** Inquiry SLA is 1 hour (acknowledge);
 *      Lead SLA is 4 hours (first substantive response). Different
 *      policies, different targets.
 */

const mongoose = require('mongoose');
const {
  INQUIRY_STATUSES,
  INQUIRY_CHANNELS,
  REFERRAL_SOURCES,
} = require('../../config/care/crm.registry');

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

const inquirySchema = new mongoose.Schema(
  {
    inquiryNumber: { type: String, required: true, unique: true, uppercase: true },

    // ── channel + source ────────────────────────────────────────
    channel: { type: String, enum: INQUIRY_CHANNELS, required: true, index: true },
    referralSource: { type: String, enum: REFERRAL_SOURCES, default: null },
    campaignTag: { type: String, default: null }, // UTM / campaign id

    // ── contact ─────────────────────────────────────────────────
    contactName: { type: String, required: true, trim: true },
    contactPhone: { type: String, default: null },
    contactEmail: { type: String, default: null },
    preferredContactMethod: {
      type: String,
      enum: ['phone', 'email', 'whatsapp', 'sms'],
      default: 'phone',
    },

    // ── subject ─────────────────────────────────────────────────
    beneficiaryAgeYears: { type: Number, default: null, min: 0, max: 120 },
    condition: { type: String, default: null }, // e.g., 'autism' / 'cerebral palsy'
    subject: { type: String, required: true }, // one-line question
    message: { type: String, default: null },

    // ── state ────────────────────────────────────────────────────
    status: {
      type: String,
      enum: INQUIRY_STATUSES,
      default: 'new',
      index: true,
    },
    statusHistory: { type: [statusHistorySchema], default: [] },

    // ── routing ──────────────────────────────────────────────────
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    ownerNameSnapshot: { type: String, default: null },

    // ── promotion ────────────────────────────────────────────────
    promotedLeadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CareLead',
      default: null,
      index: true,
    },
    promotedAt: { type: Date, default: null },
    closureReason: { type: String, default: null },

    // ── SLA backlink ────────────────────────────────────────────
    slaId: { type: mongoose.Schema.Types.ObjectId, ref: 'SLA', default: null, index: true },

    // ── misc ─────────────────────────────────────────────────────
    receivedAt: { type: Date, default: Date.now },
    acknowledgedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    tags: { type: [String], default: [] },
  },
  { timestamps: true, collection: 'care_inquiries' }
);

// ── indexes ─────────────────────────────────────────────────────────
inquirySchema.index({ status: 1, receivedAt: -1 });
inquirySchema.index({ channel: 1, referralSource: 1, receivedAt: -1 });
inquirySchema.index({ branchId: 1, status: 1 });

// ── auto-numbering INQ-YYYY-NNNNN ───────────────────────────────────
inquirySchema.pre('validate', async function () {
  if (this.inquiryNumber) return;
  const year = (this.receivedAt || new Date()).getUTCFullYear();
  const Model = mongoose.model('Inquiry');
  const count = await Model.countDocuments({
    inquiryNumber: { $regex: `^INQ-${year}-` },
  });
  this.inquiryNumber = `INQ-${year}-${String(count + 1).padStart(5, '0')}`;
});

// ── virtuals ────────────────────────────────────────────────────────
inquirySchema.virtual('ageOpenHours').get(function () {
  if (['promoted_to_lead', 'closed', 'spam'].includes(this.status)) return null;
  return Math.round(((Date.now() - this.receivedAt.getTime()) / 3600000) * 10) / 10;
});

inquirySchema.set('toJSON', { virtuals: true });
inquirySchema.set('toObject', { virtuals: true });

const Inquiry = mongoose.models.Inquiry || mongoose.model('Inquiry', inquirySchema);

module.exports = Inquiry;
