/**
 * Fleet Penalty Model - نموذج المخالفات والغرامات
 * Traffic violations, overweight penalties, regulatory fines, demerit points
 */

const mongoose = require('mongoose');

const fleetPenaltySchema = new mongoose.Schema(
  {
    penaltyNumber: { type: String, unique: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },

    type: {
      type: String,
      enum: [
        'speeding',
        'red_light',
        'illegal_parking',
        'wrong_lane',
        'overweight',
        'oversize',
        'no_seatbelt',
        'mobile_phone',
        'expired_registration',
        'expired_license',
        'expired_insurance',
        'reckless_driving',
        'dui',
        'emissions_violation',
        'load_violation',
        'hours_violation',
        'documentation_violation',
        'safety_equipment',
        'tint_violation',
        'modification_violation',
        'toll_evasion',
        'other',
      ],
      required: true,
    },

    category: {
      type: String,
      enum: [
        'traffic',
        'regulatory',
        'safety',
        'documentation',
        'environmental',
        'operational',
        'other',
      ],
      default: 'traffic',
    },

    severity: {
      type: String,
      enum: ['minor', 'moderate', 'serious', 'severe', 'critical'],
      required: true,
    },

    // Violation details
    violationDate: { type: Date, required: true },
    reportedDate: { type: Date, default: Date.now },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number],
    },
    address: { type: String },
    city: { type: String },
    region: { type: String },
    description: { type: String },
    descriptionAr: { type: String },

    // Source
    source: {
      type: String,
      enum: [
        'camera',
        'police',
        'self_reported',
        'saher',
        'muroor',
        'inspection',
        'weigh_station',
        'other',
      ],
      default: 'saher',
    },
    referenceNumber: { type: String },
    issuingAuthority: { type: String },
    issuingAuthorityAr: { type: String },

    // Financial
    fineAmount: { type: Number, required: true },
    currency: { type: String, default: 'SAR' },
    discountAmount: { type: Number, default: 0 },
    discountDeadline: { type: Date },
    lateFee: { type: Number, default: 0 },
    totalAmount: { type: Number },

    // Demerit points
    demeritPoints: { type: Number, default: 0 },
    driverTotalPoints: { type: Number },
    suspensionTriggered: { type: Boolean, default: false },

    // Payment
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid', 'overdue', 'waived', 'appealed'],
      default: 'unpaid',
    },
    paymentMethod: {
      type: String,
      enum: ['sadad', 'bank_transfer', 'cash', 'deducted_salary', 'company_account', 'other'],
    },
    paymentDate: { type: Date },
    paymentReference: { type: String },
    receiptUrl: { type: String },
    paidBy: { type: String, enum: ['company', 'driver', 'shared'], default: 'company' },
    driverShareAmount: { type: Number },

    // Appeal
    appeal: {
      filed: { type: Boolean, default: false },
      filedDate: { type: Date },
      reason: { type: String },
      reasonAr: { type: String },
      status: {
        type: String,
        enum: ['pending', 'under_review', 'accepted', 'rejected', 'partial'],
        default: 'pending',
      },
      outcome: { type: String },
      resolvedDate: { type: Date },
      revisedAmount: { type: Number },
      documents: [{ url: String, title: String }],
    },

    // Evidence
    evidence: [
      {
        type: {
          type: String,
          enum: ['photo', 'video', 'document', 'speed_reading', 'weight_ticket'],
        },
        url: { type: String },
        description: { type: String },
        capturedAt: { type: Date },
      },
    ],

    // Accountability
    responsibleParty: {
      type: String,
      enum: ['driver', 'company', 'third_party', 'shared', 'undetermined'],
      default: 'undetermined',
    },
    disciplinaryAction: {
      type: {
        type: String,
        enum: [
          'none',
          'verbal_warning',
          'written_warning',
          'fine_deduction',
          'suspension',
          'termination',
        ],
      },
      issuedDate: { type: Date },
      issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      notes: { type: String },
    },

    status: {
      type: String,
      enum: ['active', 'paid', 'appealed', 'waived', 'closed'],
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

fleetPenaltySchema.pre('save', async function (next) {
  if (!this.penaltyNumber) {
    const count = await this.constructor.countDocuments();
    this.penaltyNumber = `PEN-${String(count + 1).padStart(6, '0')}`;
  }
  // Auto-calc total
  if (this.fineAmount) {
    this.totalAmount = this.fineAmount - (this.discountAmount || 0) + (this.lateFee || 0);
  }
  next();
});

fleetPenaltySchema.index({ organization: 1, vehicle: 1, violationDate: -1 });
fleetPenaltySchema.index({ organization: 1, driver: 1, violationDate: -1 });
fleetPenaltySchema.index({ organization: 1, paymentStatus: 1, status: 1 });
fleetPenaltySchema.index({ organization: 1, type: 1 });
fleetPenaltySchema.index({ demeritPoints: 1 });
fleetPenaltySchema.index({ location: '2dsphere' });

module.exports = mongoose.models.FleetPenalty || mongoose.model('FleetPenalty', fleetPenaltySchema);
