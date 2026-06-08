/**
 * CommunityReferral Model — System 42
 * نموذج الإحالات المجتمعية
 */
const mongoose = require('mongoose');

const communityReferralSchema = new mongoose.Schema(
  {
    uuid: { type: String, unique: true, sparse: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },

    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', default: null },
    beneficiaryName: { type: String, required: true },
    beneficiaryPhone: { type: String, maxlength: 20 },

    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityResource',
      default: null,
    },

    referralType: {
      type: String,
      enum: ['internal', 'external'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'completed', 'rejected', 'no_response', 'withdrawn'],
      default: 'pending',
    },

    referralDate: { type: Date, required: true },
    followUpDate: { type: Date },
    reasonForReferral: { type: String, required: true, maxlength: 500 },
    referralNotes: { type: String },
    outcomeNotes: { type: String },

    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    consentObtained: { type: Boolean, default: false },
    acceptedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

communityReferralSchema.index({ branchId: 1, status: 1 });
communityReferralSchema.index({ referralDate: 1 });
communityReferralSchema.index({ beneficiaryId: 1 });
communityReferralSchema.index({ deletedAt: 1 });

communityReferralSchema.pre(/^find/, function () {
  if (this.getFilter().deletedAt === undefined) this.where({ deletedAt: null });
});

// W997 — surface referral outcomes on the unified-core timeline (shared
// `referral` domain). accepted / completed / rejected. Native pre-compile hooks
// per the W970 pattern (the modelEventBridge-is-dead workaround); guarded +
// fire-and-forget. Reads `beneficiary` OR `beneficiaryId` (this model uses
// beneficiaryId, optional — guarded). post('save') is a different event from the
// pre(/^find/) soft-delete filter above, so no hook-style conflict.
communityReferralSchema.post('init', function () {
  this.$__prevStatus = this.status;
});
communityReferralSchema.post('save', function (doc) {
  try {
    if (doc.status === this.$__prevStatus) return;
    const { integrationBus } = require('../integration/systemIntegrationBus');
    if (!integrationBus || typeof integrationBus.publish !== 'function') return;
    const beneficiaryId = doc.beneficiary || doc.beneficiaryId;
    if (!beneficiaryId) return;
    const base = {
      referralId: String(doc._id),
      beneficiaryId: String(beneficiaryId),
      referralType: 'community',
      status: doc.status,
    };
    if (doc.status === 'accepted') {
      Promise.resolve(integrationBus.publish('referral', 'referral.accepted', base)).catch(() => {});
    } else if (doc.status === 'completed') {
      Promise.resolve(integrationBus.publish('referral', 'referral.completed', base)).catch(() => {});
    } else if (doc.status === 'rejected' || doc.status === 'declined') {
      Promise.resolve(integrationBus.publish('referral', 'referral.rejected', base)).catch(() => {});
    }
  } catch (_) {
    /* bus not wired — never block persistence */
  }
});

module.exports =
  mongoose.models.CommunityReferral || mongoose.model('CommunityReferral', communityReferralSchema);
