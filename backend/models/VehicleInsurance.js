/**
 * Vehicle Insurance Model - نموذج تأمين المركبات
 */

const mongoose = require('mongoose');

const vehicleInsuranceSchema = new mongoose.Schema(
  {
    policyNumber: { type: String, unique: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },

    provider: {
      name: { type: String, required: true },
      nameAr: { type: String },
      contactPerson: { type: String },
      phone: { type: String },
      email: { type: String },
      address: { type: String },
    },

    type: {
      type: String,
      enum: [
        'comprehensive',
        'third_party',
        'third_party_fire_theft',
        'fleet_policy',
        'commercial',
      ],
      required: true,
    },

    coverage: {
      vehicleDamage: { type: Boolean, default: false },
      thirdPartyLiability: { type: Boolean, default: true },
      theft: { type: Boolean, default: false },
      fire: { type: Boolean, default: false },
      naturalDisaster: { type: Boolean, default: false },
      personalAccident: { type: Boolean, default: false },
      roadAssistance: { type: Boolean, default: false },
      replacementVehicle: { type: Boolean, default: false },
      medicalExpenses: { type: Boolean, default: false },
      legalExpenses: { type: Boolean, default: false },
      maxCoverageAmount: { type: Number },
      deductible: { type: Number, default: 0 },
    },

    premium: {
      amount: { type: Number, required: true },
      frequency: {
        type: String,
        enum: ['monthly', 'quarterly', 'semi_annual', 'annual'],
        default: 'annual',
      },
      currency: { type: String, default: 'SAR' },
      discount: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      totalPaid: { type: Number, default: 0 },
    },

    payments: [
      {
        amount: { type: Number },
        date: { type: Date },
        method: { type: String, enum: ['cash', 'bank_transfer', 'credit_card', 'cheque'] },
        reference: { type: String },
        status: {
          type: String,
          enum: ['paid', 'pending', 'overdue', 'cancelled'],
          default: 'pending',
        },
      },
    ],

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'suspended', 'pending_renewal', 'draft'],
      default: 'draft',
    },

    claims: [
      {
        claimNumber: { type: String },
        date: { type: Date },
        type: {
          type: String,
          enum: ['accident', 'theft', 'fire', 'natural_disaster', 'vandalism', 'other'],
        },
        description: { type: String },
        estimatedAmount: { type: Number },
        approvedAmount: { type: Number },
        status: {
          type: String,
          enum: [
            'submitted',
            'under_review',
            'approved',
            'partially_approved',
            'rejected',
            'paid',
            'closed',
          ],
          default: 'submitted',
        },
        documents: [{ name: { type: String }, url: { type: String } }],
        adjuster: { type: String },
        submittedAt: { type: Date, default: Date.now },
        resolvedAt: { type: Date },
        notes: { type: String },
      },
    ],

    renewal: {
      autoRenew: { type: Boolean, default: false },
      reminderDays: [{ type: Number, default: [30, 14, 7] }],
      lastReminderSent: { type: Date },
      renewalHistory: [
        {
          previousPolicyNumber: { type: String },
          renewedAt: { type: Date },
          newPremium: { type: Number },
        },
      ],
    },

    documents: [
      {
        name: { type: String },
        type: {
          type: String,
          enum: ['policy', 'certificate', 'endorsement', 'claim_form', 'receipt', 'other'],
        },
        url: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    notes: { type: String },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

vehicleInsuranceSchema.index({ vehicle: 1, status: 1 });
vehicleInsuranceSchema.index({ organization: 1, endDate: 1 });
vehicleInsuranceSchema.index({ 'provider.name': 1 });

vehicleInsuranceSchema.pre('save', function (next) {
  if (this.endDate && new Date(this.endDate) < new Date() && this.status === 'active') {
    this.status = 'expired';
  }
  next();
});

module.exports = mongoose.models.VehicleInsurance || mongoose.model('VehicleInsurance', vehicleInsuranceSchema);
