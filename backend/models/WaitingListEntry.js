/**
 * WaitingListEntry — beneficiary (or prospective beneficiary) waiting
 * for an open slot in a service line.
 *
 * Clinics with finite therapist capacity always have a waiting list;
 * managing it poorly costs revenue (enrollments drift to competitors)
 * and creates clinical harm (urgent cases fall behind routine).
 *
 * States:
 *   waiting   — default on creation
 *   offered   — slot offered; awaiting guardian confirmation
 *   enrolled  — guardian accepted; beneficiary linked + row archived
 *   withdrawn — guardian cancelled before enrollment
 *   lapsed    — offer expired without response
 *
 * Not scoped by branch at the model level — a guardian may be willing
 * to accept any branch, in which case branchId is null. Filtering per
 * branch happens at the route layer via the service's filter param.
 */

'use strict';

const mongoose = require('mongoose');

const WaitingListEntrySchema = new mongoose.Schema(
  {
    // Either beneficiaryId (already a known beneficiary wanting a new
    // service line) or guardianId (prospective family) must be set.
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      index: true,
    },
    guardianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guardian',
      index: true,
    },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },

    // Prospective-beneficiary contact info if no Beneficiary record yet.
    prospectName: String,
    prospectPhone: String,
    prospectChildDob: Date,

    serviceType: {
      type: String,
      enum: ['علاج طبيعي', 'علاج وظيفي', 'نطق وتخاطب', 'علاج سلوكي', 'علاج نفسي', 'أخرى'],
      required: true,
    },

    // 1=urgent (medical/priority), 5=routine
    priority: { type: Number, min: 1, max: 5, default: 3, index: true },

    requestedAt: { type: Date, default: Date.now, required: true, index: true },
    referredBy: String, // therapist name or external referrer

    status: {
      type: String,
      enum: ['waiting', 'offered', 'enrolled', 'withdrawn', 'lapsed'],
      default: 'waiting',
      required: true,
      index: true,
    },
    offeredAt: Date,
    offerExpiresAt: Date,
    resolvedAt: Date, // set when status leaves 'waiting' or 'offered'

    notes: { type: String, trim: true, maxlength: 1000 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Primary query: open waiters per branch, highest priority first.
WaitingListEntrySchema.index({ branchId: 1, status: 1, priority: 1, requestedAt: 1 });
// Service-type breakdown.
WaitingListEntrySchema.index({ serviceType: 1, status: 1 });

// W1091 — unified-core linkage: emit when a KNOWN beneficiary joins the
// waiting list for a new service line (prospective-only rows have no
// beneficiaryId and are intentionally not surfaced on a timeline).
WaitingListEntrySchema.pre('save', function flagWaitingListJoined() {
  this.$__waitingListJoined = this.isNew && this.status === 'waiting' && !!this.beneficiaryId;
});

WaitingListEntrySchema.post('save', function emitWaitingListJoined(doc) {
  if (!doc.$__waitingListJoined) return;
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    integrationBus.publish('waiting-list', 'waiting_list.joined', {
      entryId: String(doc._id),
      beneficiaryId: doc.beneficiaryId,
      ...(doc.branchId ? { branchId: doc.branchId } : {}),
      serviceType: doc.serviceType,
      priority: doc.priority,
      requestedAt: doc.requestedAt || doc.createdAt || new Date(),
    });
  } catch (_e) {
    /* bus optional — never block the write */
  }
});

module.exports =
  mongoose.models.WaitingListEntry || mongoose.model('WaitingListEntry', WaitingListEntrySchema);
