/**
 * CsoPartnership Model — System 42
 * نموذج شراكات منظمات المجتمع المدني
 */
const mongoose = require('mongoose');

const csoPartnershipSchema = new mongoose.Schema(
  {
    uuid: { type: String, unique: true, sparse: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },

    organizationName: { type: String, required: true, trim: true },
    organizationNameAr: { type: String, trim: true },
    organizationType: {
      type: String,
      enum: ['ngo', 'charity', 'government', 'private', 'academic'],
      required: true,
    },

    contactPerson: { type: String },
    contactEmail: { type: String, lowercase: true, trim: true },
    contactPhone: { type: String, maxlength: 20 },
    website: { type: String },
    address: { type: String },
    city: { type: String },

    partnershipType: {
      type: String,
      enum: ['mou', 'service_agreement', 'referral', 'sponsorship'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'expired', 'pending'],
      default: 'active',
    },
    partnershipStart: { type: Date },
    partnershipEnd: { type: Date },
    partnershipScope: { type: String },
    servicesProvided: [{ type: String }],
    servicesReceived: [{ type: String }],
    mouDocumentPath: { type: String },
    isDisabilityFocused: { type: Boolean, default: false },
    notes: { type: String },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

csoPartnershipSchema.index({ branchId: 1, status: 1 });
csoPartnershipSchema.index({ organizationType: 1 });
csoPartnershipSchema.index({ partnershipType: 1 });
csoPartnershipSchema.index({ deletedAt: 1 });

csoPartnershipSchema.pre(/^find/, function () {
  if (this.getFilter().deletedAt === undefined) this.where({ deletedAt: null });
});

module.exports =
  mongoose.models.CsoPartnership || mongoose.model('CsoPartnership', csoPartnershipSchema);
