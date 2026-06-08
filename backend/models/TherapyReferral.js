'use strict';

/**
 * TherapyReferral — clinical referral between therapists / specialties.
 * Used by `routes/therapistUltra.routes.js` `/referrals`. Distinct from
 * `CommunityReferral` (referrals to outside community resources).
 */

const mongoose = require('mongoose');

if (mongoose.models.TherapyReferral) {
  module.exports = mongoose.models.TherapyReferral;
} else {
  const schema = new mongoose.Schema(
    {
      referralNumber: { type: String, unique: true, sparse: true },
      referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
      referredTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
      referredToSpecialty: { type: String, default: null },
      beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
      reason: { type: String, required: true },
      urgency: { type: String, enum: ['routine', 'urgent', 'emergency'], default: 'routine' },
      status: {
        type: String,
        enum: ['pending', 'accepted', 'declined', 'completed', 'cancelled'],
        default: 'pending',
      },
      notes: { type: String, default: null },
      respondedAt: { type: Date, default: null },
      completedAt: { type: Date, default: null },
      branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
      deletedAt: { type: Date, default: null },
    },
    { timestamps: true, collection: 'therapyreferrals' }
  );

  schema.index({ referrer: 1, status: 1 });
  schema.index({ referredTo: 1, status: 1 });

  // W997 — surface referral outcomes on the unified-core timeline (shared
  // `referral` domain across the 4 referral subsystems): accepted / completed /
  // declined-or-rejected. Native pre-compile hooks per the W970 pattern (the
  // modelEventBridge-is-dead workaround); guarded + fire-and-forget. Reads
  // `beneficiary` OR `beneficiaryId` so the same hook works across all 4 models.
  schema.post('init', function () {
    this.$__prevStatus = this.status;
  });
  schema.post('save', function (doc) {
    try {
      if (doc.status === this.$__prevStatus) return;
      const { integrationBus } = require('../integration/systemIntegrationBus');
      if (!integrationBus || typeof integrationBus.publish !== 'function') return;
      const beneficiaryId = doc.beneficiary || doc.beneficiaryId;
      if (!beneficiaryId) return;
      const base = {
        referralId: String(doc._id),
        beneficiaryId: String(beneficiaryId),
        referralType: 'therapy',
        status: doc.status,
      };
      if (doc.status === 'accepted') {
        Promise.resolve(integrationBus.publish('referral', 'referral.accepted', base)).catch(
          () => {}
        );
      } else if (doc.status === 'completed') {
        Promise.resolve(integrationBus.publish('referral', 'referral.completed', base)).catch(
          () => {}
        );
      } else if (doc.status === 'rejected' || doc.status === 'declined') {
        Promise.resolve(integrationBus.publish('referral', 'referral.rejected', base)).catch(
          () => {}
        );
      }
    } catch (_) {
      /* bus not wired — never block persistence */
    }
  });

  module.exports =
    mongoose.models.TherapyReferral || mongoose.model('TherapyReferral', schema);
}
