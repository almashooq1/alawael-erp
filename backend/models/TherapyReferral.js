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

  module.exports = mongoose.model('TherapyReferral', schema);
}
