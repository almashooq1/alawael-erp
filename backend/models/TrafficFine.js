/**
 * Toll & Fine Management Model - نموذج إدارة الرسوم والمخالفات المرورية
 */

const mongoose = require('mongoose');

const trafficFineSchema = new mongoose.Schema(
  {
    fineNumber: { type: String, unique: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },

    type: {
      type: String,
      enum: [
        'speeding',
        'red_light',
        'illegal_parking',
        'seatbelt',
        'mobile_phone',
        'wrong_lane',
        'illegal_turn',
        'overloading',
        'expired_registration',
        'no_insurance',
        'reckless_driving',
        'tailgating',
        'illegal_overtaking',
        'no_license',
        'tinted_windows',
        'toll_evasion',
        'other',
      ],
      required: true,
    },

    source: {
      type: String,
      enum: ['saher', 'traffic_police', 'municipality', 'toll_system', 'manual', 'other'],
      default: 'saher',
    },

    violation: {
      date: { type: Date, required: true },
      time: { type: String },
      location: { type: String },
      locationAr: { type: String },
      coordinates: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number] },
      },
      speed: { type: Number },
      speedLimit: { type: Number },
      description: { type: String },
      evidenceUrl: { type: String },
      referenceNumber: { type: String },
    },

    fine: {
      amount: { type: Number, required: true },
      currency: { type: String, default: 'SAR' },
      dueDate: { type: Date },
      discountAmount: { type: Number, default: 0 },
      discountDeadline: { type: Date },
      lateFee: { type: Number, default: 0 },
      totalAmount: { type: Number },
    },

    status: {
      type: String,
      enum: [
        'pending',
        'paid',
        'disputed',
        'appealed',
        'dismissed',
        'overdue',
        'deducted_from_salary',
        'waived',
      ],
      default: 'pending',
    },

    payment: {
      method: {
        type: String,
        enum: ['cash', 'bank_transfer', 'credit_card', 'salary_deduction', 'absher', 'sadad'],
      },
      reference: { type: String },
      paidAt: { type: Date },
      paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      receipt: { type: String },
    },

    dispute: {
      filed: { type: Boolean, default: false },
      reason: { type: String },
      filedAt: { type: Date },
      filedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      outcome: { type: String, enum: ['pending', 'upheld', 'reduced', 'dismissed'] },
      resolvedAt: { type: Date },
      documents: [{ name: String, url: String }],
    },

    assignment: {
      assignedTo: { type: String, enum: ['company', 'driver', 'shared'], default: 'company' },
      driverSharePercentage: { type: Number, default: 0 },
      acknowledgedByDriver: { type: Boolean, default: false },
      acknowledgedAt: { type: Date },
    },

    notes: { type: String },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

trafficFineSchema.index({ vehicle: 1, 'violation.date': -1 });
trafficFineSchema.index({ driver: 1, status: 1 });
trafficFineSchema.index({ organization: 1, status: 1, 'fine.dueDate': 1 });

trafficFineSchema.pre('save', async function (next) {
  if (!this.fineNumber) {
    const count = await mongoose.model('TrafficFine').countDocuments();
    this.fineNumber = `FIN-${String(count + 1).padStart(6, '0')}`;
  }
  this.fine.totalAmount = this.fine.amount - this.fine.discountAmount + this.fine.lateFee;
  if (this.fine.dueDate && new Date(this.fine.dueDate) < new Date() && this.status === 'pending') {
    this.status = 'overdue';
  }
  next();
});

// Toll Transaction Schema
const tollTransactionSchema = new mongoose.Schema(
  {
    transactionNumber: { type: String, unique: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },

    tollGate: {
      name: { type: String, required: true },
      nameAr: { type: String },
      location: { type: String },
      operator: { type: String },
      road: { type: String },
    },

    passage: {
      date: { type: Date, required: true },
      direction: { type: String, enum: ['entry', 'exit', 'single'] },
      tagNumber: { type: String },
      vehicleClass: { type: String, enum: ['light', 'medium', 'heavy', 'oversized'] },
    },

    amount: { type: Number, required: true },
    currency: { type: String, default: 'SAR' },
    status: {
      type: String,
      enum: ['charged', 'paid', 'pending', 'disputed', 'waived'],
      default: 'charged',
    },

    paymentMethod: { type: String, enum: ['prepaid_tag', 'postpaid', 'cash', 'bank'] },
    paymentReference: { type: String },

    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

tollTransactionSchema.index({ vehicle: 1, 'passage.date': -1 });
tollTransactionSchema.index({ organization: 1, 'passage.date': -1 });

tollTransactionSchema.pre('save', async function (next) {
  if (!this.transactionNumber) {
    const count = await mongoose.model('TollTransaction').countDocuments();
    this.transactionNumber = `TLL-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

const TrafficFine = mongoose.model('TrafficFine', trafficFineSchema);
const TollTransaction = mongoose.model('TollTransaction', tollTransactionSchema);

module.exports = { TrafficFine, TollTransaction };
