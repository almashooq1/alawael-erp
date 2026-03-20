/**
 * Fleet Warranty Model - نموذج ضمانات الأسطول
 * Vehicle and parts warranty management, claim tracking
 */

const mongoose = require('mongoose');

const fleetWarrantySchema = new mongoose.Schema(
  {
    warrantyNumber: { type: String, unique: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    part: { type: mongoose.Schema.Types.ObjectId, ref: 'FleetPart' },

    type: {
      type: String,
      enum: [
        'vehicle_manufacturer',
        'powertrain',
        'body',
        'electrical',
        'battery',
        'emission',
        'tire',
        'parts',
        'extended',
        'third_party',
        'service_contract',
        'other',
      ],
      required: true,
    },

    category: {
      type: String,
      enum: ['vehicle', 'part', 'component', 'service'],
      default: 'vehicle',
    },

    // Warranty details
    title: { type: String, required: true },
    titleAr: { type: String },
    description: { type: String },
    provider: {
      name: { type: String, required: true },
      nameAr: { type: String },
      phone: { type: String },
      email: { type: String },
      contactPerson: { type: String },
      dealerName: { type: String },
      dealerAddress: { type: String },
    },

    // Coverage
    coverage: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      maxMileage: { type: Number },
      currentMileage: { type: Number },
      maxClaims: { type: Number },
      usedClaims: { type: Number, default: 0 },
      deductible: { type: Number, default: 0 },
      maxCoverageAmount: { type: Number },
      usedCoverageAmount: { type: Number, default: 0 },
    },

    // Cost
    purchasePrice: { type: Number },
    currency: { type: String, default: 'SAR' },

    // What's covered
    coveredItems: [{ item: String, itemAr: String, included: { type: Boolean, default: true } }],
    exclusions: [{ item: String, itemAr: String }],
    termsAndConditions: { type: String },

    // Claims
    claims: [
      {
        claimNumber: { type: String },
        claimDate: { type: Date },
        issue: { type: String },
        issueAr: { type: String },
        status: {
          type: String,
          enum: [
            'submitted',
            'under_review',
            'approved',
            'partially_approved',
            'denied',
            'completed',
            'cancelled',
          ],
          default: 'submitted',
        },
        claimAmount: { type: Number },
        approvedAmount: { type: Number },
        laborCost: { type: Number },
        partsCost: { type: Number },
        denialReason: { type: String },
        repairDate: { type: Date },
        completedDate: { type: Date },
        documents: [{ url: String, title: String }],
        processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    // Documents
    documents: [{ url: String, title: String, type: String }],

    // Reminder
    reminderDays: { type: Number, default: 60 },

    status: {
      type: String,
      enum: ['active', 'expiring_soon', 'expired', 'voided', 'transferred'],
      default: 'active',
    },

    notes: { type: String },
    notesAr: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

fleetWarrantySchema.pre('save', async function (next) {
  if (!this.warrantyNumber) {
    const count = await this.constructor.countDocuments();
    this.warrantyNumber = `WRN-${String(count + 1).padStart(6, '0')}`;
  }
  // Auto-detect expiring_soon/expired
  if (this.coverage && this.coverage.endDate) {
    const now = new Date();
    const daysLeft = Math.ceil((this.coverage.endDate - now) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 0) this.status = 'expired';
    else if (daysLeft <= (this.reminderDays || 60)) this.status = 'expiring_soon';
  }
  next();
});

fleetWarrantySchema.index({ organization: 1, vehicle: 1 });
fleetWarrantySchema.index({ organization: 1, status: 1 });
fleetWarrantySchema.index({ 'coverage.endDate': 1 });
fleetWarrantySchema.index({ organization: 1, type: 1 });

module.exports = mongoose.model('FleetWarranty', fleetWarrantySchema);
