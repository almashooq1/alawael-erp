/**
 * Fleet Document Model - نموذج مستندات الأسطول
 * Vehicle documents, registrations, permits, certificates tracking
 */

const mongoose = require('mongoose');

const fleetDocumentSchema = new mongoose.Schema(
  {
    documentNumber: { type: String, unique: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },

    type: {
      type: String,
      enum: [
        'vehicle_registration',
        'istimara',
        'fahas',
        'operating_permit',
        'insurance_certificate',
        'emissions_certificate',
        'road_worthiness',
        'driver_license',
        'driver_license_copy',
        'hazmat_permit',
        'oversize_permit',
        'route_permit',
        'customs_clearance',
        'ownership_transfer',
        'lease_agreement',
        'inspection_report',
        'accident_report',
        'other',
      ],
      required: true,
    },
    category: {
      type: String,
      enum: ['vehicle', 'driver', 'operational', 'regulatory', 'financial', 'other'],
      default: 'vehicle',
    },

    title: { type: String, required: true },
    titleAr: { type: String },
    description: { type: String },
    referenceNumber: { type: String },
    issuedBy: { type: String },
    issuedByAr: { type: String },

    issueDate: { type: Date },
    expiryDate: { type: Date },
    renewalDate: { type: Date },

    status: {
      type: String,
      enum: ['active', 'expired', 'expiring_soon', 'pending_renewal', 'revoked', 'archived'],
      default: 'active',
    },

    files: [
      {
        filename: { type: String, required: true },
        originalName: { type: String },
        mimeType: { type: String },
        size: { type: Number },
        url: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    reminderDays: { type: Number, default: 30 },
    reminderSent: { type: Boolean, default: false },
    lastReminderAt: { type: Date },

    renewalCost: { type: Number },
    currency: { type: String, default: 'SAR' },

    notes: { type: String },
    tags: [{ type: String }],

    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },

    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Auto-generate document number
fleetDocumentSchema.pre('save', async function (next) {
  if (!this.documentNumber) {
    const count = await mongoose.model('FleetDocument').countDocuments();
    this.documentNumber = `DOC-${String(count + 1).padStart(6, '0')}`;
  }
  // Auto-set expiring_soon status
  if (this.expiryDate && this.status === 'active') {
    const daysUntilExpiry = Math.ceil((this.expiryDate - new Date()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 0) this.status = 'expired';
    else if (daysUntilExpiry <= this.reminderDays) this.status = 'expiring_soon';
  }
  next();
});

fleetDocumentSchema.index({ organization: 1, type: 1 });
fleetDocumentSchema.index({ vehicle: 1, type: 1 });
fleetDocumentSchema.index({ driver: 1, type: 1 });
fleetDocumentSchema.index({ expiryDate: 1, status: 1 });

module.exports = mongoose.model('FleetDocument', fleetDocumentSchema);
