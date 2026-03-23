/**
 * Fleet Compliance & Regulatory Model - نموذج الامتثال التنظيمي للأسطول
 */

const mongoose = require('mongoose');

const fleetComplianceSchema = new mongoose.Schema(
  {
    complianceNumber: { type: String, unique: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },

    category: {
      type: String,
      enum: [
        'vehicle_registration',
        'istimara_renewal',
        'mvpi_inspection',
        'emissions_test',
        'road_worthiness',
        'operating_license',
        'hazmat_permit',
        'commercial_permit',
        'weight_certification',
        'tachograph_calibration',
        'fire_extinguisher',
        'first_aid_kit',
        'reflective_triangle',
        'speed_limiter',
        'gps_device',
        'driver_license_renewal',
        'driver_medical_exam',
        'driver_drug_test',
        'insurance_renewal',
        'toll_tag',
        'customs_permit',
      ],
      required: true,
    },

    status: {
      type: String,
      enum: [
        'compliant',
        'non_compliant',
        'expiring_soon',
        'expired',
        'pending_review',
        'exempt',
        'waived',
      ],
      default: 'pending_review',
    },

    authority: {
      name: { type: String },
      nameAr: { type: String },
      type: {
        type: String,
        enum: ['muroor', 'mot', 'gaca', 'tga', 'municipality', 'civil_defense', 'customs', 'other'],
      },
      referenceNumber: { type: String },
    },

    requirement: {
      description: { type: String },
      descriptionAr: { type: String },
      regulationReference: { type: String },
      mandatory: { type: Boolean, default: true },
      penaltyAmount: { type: Number, default: 0 },
      penaltyType: { type: String, enum: ['fine', 'suspension', 'revocation', 'impound', 'none'] },
    },

    dates: {
      issueDate: { type: Date },
      expiryDate: { type: Date },
      lastCheckDate: { type: Date },
      nextCheckDate: { type: Date },
      renewalDate: { type: Date },
    },

    documents: [
      {
        name: { type: String },
        type: { type: String },
        url: { type: String },
        uploadedAt: { type: Date, default: Date.now },
        expiryDate: { type: Date },
      },
    ],

    inspectionResult: {
      passed: { type: Boolean },
      score: { type: Number },
      findings: [{ item: String, result: String, notes: String }],
      inspectorName: { type: String },
      inspectorId: { type: String },
      inspectedAt: { type: Date },
    },

    reminders: {
      enabled: { type: Boolean, default: true },
      daysBefore: [{ type: Number }],
      lastSent: { type: Date },
      channels: [{ type: String, enum: ['email', 'sms', 'push', 'whatsapp'] }],
    },

    history: [
      {
        action: { type: String },
        date: { type: Date, default: Date.now },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        previousStatus: { type: String },
        newStatus: { type: String },
        notes: { type: String },
      },
    ],

    notes: { type: String },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

fleetComplianceSchema.index({ vehicle: 1, category: 1, status: 1 });
fleetComplianceSchema.index({ organization: 1, status: 1, 'dates.expiryDate': 1 });
fleetComplianceSchema.index({ driver: 1, category: 1 });

fleetComplianceSchema.pre('save', async function (next) {
  if (!this.complianceNumber) {
    const count = await mongoose.model('FleetCompliance').countDocuments();
    this.complianceNumber = `CMP-${String(count + 1).padStart(6, '0')}`;
  }
  if (this.dates.expiryDate) {
    const now = new Date();
    const expiry = new Date(this.dates.expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry < 0 && this.status !== 'exempt' && this.status !== 'waived') {
      this.status = 'expired';
    } else if (daysUntilExpiry <= 30 && this.status === 'compliant') {
      this.status = 'expiring_soon';
    }
  }
  next();
});

module.exports = mongoose.models.FleetCompliance || mongoose.model('FleetCompliance', fleetComplianceSchema);
