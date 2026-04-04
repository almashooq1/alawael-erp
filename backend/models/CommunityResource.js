/**
 * CommunityResource Model — System 42
 * نموذج قاعدة بيانات الموارد المجتمعية
 */
const mongoose = require('mongoose');

const communityResourceSchema = new mongoose.Schema(
  {
    uuid: { type: String, unique: true, sparse: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },

    resourceName: { type: String, required: true, trim: true },
    resourceNameAr: { type: String, trim: true },
    resourceType: {
      type: String,
      enum: ['service', 'facility', 'financial_aid', 'employment', 'education', 'health'],
      required: true,
    },

    providerName: { type: String, required: true },
    providerType: {
      type: String,
      enum: ['government', 'ngo', 'private'],
      required: true,
    },
    description: { type: String },
    eligibilityCriteria: { type: String },

    contactPhone: { type: String, maxlength: 20 },
    contactEmail: { type: String, lowercase: true, trim: true },
    website: { type: String },
    address: { type: String },
    city: { type: String },

    isDisabilitySpecific: { type: Boolean, default: false },
    disabilityTypesServed: [{ type: String }],
    availability: {
      type: String,
      enum: ['always', 'weekdays', 'by_appointment'],
      default: 'weekdays',
    },
    isFree: { type: Boolean, default: false },
    costDetails: { type: String },
    isVerified: { type: Boolean, default: false },
    lastVerifiedAt: { type: Date },
    isActive: { type: Boolean, default: true },
    notes: { type: String },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

communityResourceSchema.index({ branchId: 1, isActive: 1 });
communityResourceSchema.index({ resourceType: 1 });
communityResourceSchema.index({ city: 1 });
communityResourceSchema.index({ isDisabilitySpecific: 1 });
communityResourceSchema.index({ deletedAt: 1 });

communityResourceSchema.pre(/^find/, function () {
  if (this.getFilter().deletedAt === undefined) this.where({ deletedAt: null });
});

module.exports = mongoose.model('CommunityResource', communityResourceSchema);
