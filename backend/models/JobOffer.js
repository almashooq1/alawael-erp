/**
 * JobOffer Model — System 43
 * نموذج عروض العمل
 */
const mongoose = require('mongoose');

const jobOfferSchema = new mongoose.Schema(
  {
    uuid: { type: String, unique: true, sparse: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobApplication',
      required: true,
      unique: true,
    },
    jobPostingId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPosting', required: true },

    offerNumber: { type: String, unique: true, required: true },
    status: {
      type: String,
      enum: ['draft', 'sent', 'accepted', 'rejected', 'expired', 'withdrawn'],
      default: 'draft',
    },

    offeredSalary: { type: Number, required: true, min: 0 },
    salaryCurrency: { type: String, default: 'SAR' },
    employmentType: {
      type: String,
      enum: ['full_time', 'part_time', 'contract'],
      required: true,
    },

    offerDate: { type: Date, required: true },
    offerExpiry: { type: Date, required: true },
    proposedStartDate: { type: Date, required: true },
    benefitsPackage: [{ type: mongoose.Schema.Types.Mixed }],
    offerLetterPath: { type: String },

    sentAt: { type: Date, default: null },
    respondedAt: { type: Date, default: null },
    rejectionReason: { type: String },
    notes: { type: String },

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

jobOfferSchema.index({ branchId: 1, status: 1 });
jobOfferSchema.index({ offerDate: 1 });
jobOfferSchema.index({ offerExpiry: 1 });
jobOfferSchema.index({ applicationId: 1 });
jobOfferSchema.index({ deletedAt: 1 });

jobOfferSchema.pre(/^find/, function () {
  if (this.getFilter().deletedAt === undefined) this.where({ deletedAt: null });
});

module.exports = mongoose.model('JobOffer', jobOfferSchema);
