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

// ── W1061: unified-core linkage ───────────────────────────────────────
// Completing a referral is the milestone. Publish
// community_referral.completed → CareTimeline. NON-callback hooks only.
communityReferralSchema.pre('save', function () {
  this.$__communityReferralCompletedNow =
    this.status === 'completed' && (this.isNew || this.isModified('status'));
});

function emitCommunityReferralCompleted(doc) {
  if (!doc || !doc.$__communityReferralCompletedNow) return;
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    integrationBus.publish('community-referral', 'community_referral.completed', {
      referralId: String(doc._id),
      beneficiaryId: doc.beneficiaryId ? String(doc.beneficiaryId) : null,
      ...(doc.branchId ? { branchId: String(doc.branchId) } : {}),
      referralType: doc.referralType,
      completedAt: doc.completedAt || doc.updatedAt || new Date(),
    });
  } catch (_err) {
    /* bus optional — never block the write */
  }
}

communityReferralSchema.post('save', emitCommunityReferralCompleted);

module.exports =
  mongoose.models.CommunityReferral || mongoose.model('CommunityReferral', communityReferralSchema);
