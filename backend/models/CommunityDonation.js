/**
 * CommunityDonation Model — System 42
 * نموذج التبرعات والرعايات
 */
const mongoose = require('mongoose');

const communityDonationSchema = new mongoose.Schema(
  {
    uuid: { type: String, unique: true, sparse: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityProgram',
      default: null,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityEvent',
      default: null,
    },

    donorName: { type: String, required: true },
    donorType: {
      type: String,
      enum: ['individual', 'company', 'government', 'anonymous'],
      required: true,
    },
    donorEmail: { type: String, lowercase: true, trim: true },
    donorPhone: { type: String, maxlength: 20 },

    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'SAR' },
    donationType: {
      type: String,
      enum: ['cash', 'in_kind', 'sponsorship'],
      required: true,
    },
    status: {
      type: String,
      enum: ['received', 'pending', 'refunded'],
      default: 'received',
    },
    donationDate: { type: Date, required: true },
    receiptNumber: { type: String, unique: true, sparse: true },
    purpose: { type: String },
    inKindDescription: { type: String },

    isAnonymous: { type: Boolean, default: false },
    taxReceiptRequested: { type: Boolean, default: false },
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'cash', 'online'],
      default: null,
    },
    referenceNumber: { type: String },
    notes: { type: String },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

communityDonationSchema.index({ branchId: 1, status: 1 });
communityDonationSchema.index({ donationDate: 1 });
communityDonationSchema.index({ donorType: 1 });
communityDonationSchema.index({ programId: 1 });
communityDonationSchema.index({ deletedAt: 1 });

communityDonationSchema.pre(/^find/, function () {
  if (this.getFilter().deletedAt === undefined) this.where({ deletedAt: null });
});

module.exports =
  mongoose.models.CommunityDonation || mongoose.model('CommunityDonation', communityDonationSchema);
