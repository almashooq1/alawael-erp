/**
 * ReferralTracking — business-side referral network analytics.
 *
 * Orthogonal to the existing FHIR R4 Referral model (which carries
 * clinical payload + regulator workflows). This one is the lightweight
 * CRM-style record the marketing / growth team uses to answer:
 *   • who sends us new families? (top referrers)
 *   • what % of referrals convert to enrollments?
 *   • which outgoing referrals are stuck without a follow-up?
 *
 * Feeds referralTrackingService which is pure math — summarize,
 * topReferrers, closeLoopGaps, trendByMonth — and the admin surface at
 * /api/admin/referrals.
 */

'use strict';

const mongoose = require('mongoose');

const ReferralTrackingSchema = new mongoose.Schema(
  {
    direction: {
      type: String,
      enum: ['incoming', 'outgoing'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'converted', 'withdrawn'],
      default: 'pending',
      required: true,
      index: true,
    },

    // For incoming: who sent this family to us.
    referralSource: String,
    sourceOrgSlug: { type: String, lowercase: true, trim: true, index: true },

    // For outgoing: where we sent the beneficiary.
    destinationOrg: String,
    destinationOrgSlug: { type: String, lowercase: true, trim: true, index: true },

    // Beneficiary link (known or prospective).
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      index: true,
    },
    prospectName: String,
    prospectPhone: String,

    serviceType: {
      type: String,
      enum: ['علاج طبيعي', 'علاج وظيفي', 'نطق وتخاطب', 'علاج سلوكي', 'علاج نفسي', 'أخرى'],
    },

    receivedAt: { type: Date, default: Date.now, required: true, index: true },
    settledAt: Date,
    notes: { type: String, trim: true, maxlength: 1000 },

    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

ReferralTrackingSchema.index({ direction: 1, status: 1, receivedAt: -1 });
ReferralTrackingSchema.index({ sourceOrgSlug: 1, status: 1 });

module.exports =
  mongoose.models.ReferralTracking || mongoose.model('ReferralTracking', ReferralTrackingSchema);
