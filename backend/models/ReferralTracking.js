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

// ─── Unified-core producer (W997) ────────────────────────────────────────────
// Emit referrals.referral.converted exactly once when a referral for a KNOWN
// beneficiary reaches 'converted' (the referral resulted in the beneficiary
// entering/continuing care). The flag is computed in a sync pre('save') and the
// event is published in post('save'). Prospective referrals (no beneficiaryId)
// stay invisible to the longitudinal record — guarded in the post hook.
ReferralTrackingSchema.pre('save', function () {
  this.$__convertedNow = this.status === 'converted' && (this.isNew || this.isModified('status'));
});

ReferralTrackingSchema.post('save', function (doc) {
  try {
    if (!this.$__convertedNow) return;
    if (!doc.beneficiaryId) return;
    const { integrationBus } = require('../integration/systemIntegrationBus');
    if (!integrationBus || typeof integrationBus.publish !== 'function') return;
    integrationBus.publish('referrals', 'referral.converted', {
      referralId: String(doc._id),
      beneficiaryId: String(doc.beneficiaryId),
      branchId: doc.branchId ? String(doc.branchId) : null,
      direction: doc.direction || null,
      serviceType: doc.serviceType || null,
      convertedAt: doc.settledAt || doc.updatedAt || new Date(),
    });
  } catch (_err) {
    // Producer must never break the save path.
  }
});

module.exports =
  mongoose.models.ReferralTracking || mongoose.model('ReferralTracking', ReferralTrackingSchema);
