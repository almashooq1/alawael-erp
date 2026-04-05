/**
 * CrmPartner Model — نموذج شركاء الأعمال B2B
 */
const mongoose = require('mongoose');

const crmPartnerSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true },
    name: { type: String, required: true, maxlength: 200 },
    nameAr: { type: String, maxlength: 200 },
    type: {
      type: String,
      enum: [
        'hospital',
        'clinic',
        'school',
        'ngo',
        'government',
        'insurance',
        'corporate',
        'other',
      ],
      default: 'other',
    },
    contactPerson: { type: String, maxlength: 150 },
    contactPhone: { type: String, maxlength: 20 },
    contactEmail: { type: String, maxlength: 150, lowercase: true },
    website: { type: String, maxlength: 300 },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending', 'suspended'],
      default: 'pending',
    },
    commissionRate: { type: Number, default: 0, min: 0, max: 100 },
    commissionType: { type: String, enum: ['percentage', 'fixed', 'none'], default: 'none' },
    contractNumber: { type: String, maxlength: 100 },
    contractStart: { type: Date },
    contractEnd: { type: Date },
    referralCount: { type: Number, default: 0, min: 0 },
    totalRevenue: { type: Number, default: 0, min: 0 },
    notes: { type: String, maxlength: 3000 },
    servicesOffered: [{ type: String }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

crmPartnerSchema.index({ branchId: 1, status: 1 });
crmPartnerSchema.index({ branchId: 1, type: 1 });

crmPartnerSchema.pre('save', function (next) {
  if (!this.uuid) this.uuid = require('crypto').randomUUID();
  next();
});

module.exports = mongoose.models.CrmPartner || mongoose.model('CrmPartner', crmPartnerSchema);
