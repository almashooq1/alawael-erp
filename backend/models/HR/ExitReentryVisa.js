/**
 * Exit/Re-Entry Visa & Travel Management — إدارة تأشيرات الخروج والعودة
 * Saudi Arabia — Muqeem/Absher integration
 * Single & multiple exit-re-entry visa tracking
 */
const mongoose = require('mongoose');

const TravelRecordSchema = new mongoose.Schema(
  {
    departureDate: { type: Date },
    expectedReturnDate: { type: Date },
    actualReturnDate: { type: Date },
    destination: { type: String },
    airlineName: { type: String },
    flightNumber: { type: String },
    departureAirport: { type: String },
    returnAirport: { type: String },
    status: {
      type: String,
      enum: ['مخطط', 'سافر', 'عاد', 'متأخر', 'لم يعد', 'ملغي'],
      default: 'مخطط',
    },
    lateReturnDays: { type: Number, default: 0 },
    notes: { type: String },
  },
  { timestamps: true }
);

const ExitReentryVisaSchema = new mongoose.Schema(
  {
    visaRequestNumber: {
      type: String,
      unique: true,
      required: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    // ── Visa Type ──
    visaType: {
      type: String,
      enum: ['خروج وعودة مفرد', 'خروج وعودة متعدد', 'خروج نهائي'],
      required: true,
    },
    // ── Visa Details ──
    visaNumber: { type: String },
    issueDate: { type: Date },
    expiryDate: { type: Date },
    duration: { type: Number }, // days for single, months for multiple
    remainingTrips: { type: Number }, // for multiple
    maxTrips: { type: Number },
    // ── Muqeem/Absher ──
    muqeemReference: { type: String },
    absherReference: { type: String },
    borderNumber: { type: String },
    // ── Government Fees ──
    fees: {
      visaFee: { type: Number, default: 0 },
      insuranceFee: { type: Number, default: 0 },
      serviceFee: { type: Number, default: 0 },
      totalFee: { type: Number, default: 0 },
      paidBy: {
        type: String,
        enum: ['الشركة', 'الموظف'],
        default: 'الشركة',
      },
    },
    // ── Iqama Info ──
    iqamaNumber: { type: String },
    iqamaExpiry: { type: Date },
    passportNumber: { type: String },
    passportExpiry: { type: Date },
    nationality: { type: String },
    // ── Request Workflow ──
    requestDate: { type: Date, default: Date.now },
    reason: { type: String },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // ── Approval ──
    managerApproval: {
      status: {
        type: String,
        enum: ['قيد الانتظار', 'معتمد', 'مرفوض'],
        default: 'قيد الانتظار',
      },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      date: { type: Date },
      notes: { type: String },
    },
    hrApproval: {
      status: {
        type: String,
        enum: ['قيد الانتظار', 'معتمد', 'مرفوض'],
        default: 'قيد الانتظار',
      },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      date: { type: Date },
      notes: { type: String },
    },
    // ── Blocking Conditions ──
    blockingConditions: {
      hasPendingCustody: { type: Boolean, default: false },
      hasOutstandingLoans: { type: Boolean, default: false },
      hasActiveProject: { type: Boolean, default: false },
      hasPendingSettlement: { type: Boolean, default: false },
      blocked: { type: Boolean, default: false },
      blockingReasons: [{ type: String }],
    },
    // ── Travel History ──
    travelRecords: [TravelRecordSchema],
    // ── Status ──
    status: {
      type: String,
      enum: ['مسودة', 'قيد الموافقة', 'معتمد', 'صادر', 'مستخدم', 'منتهي', 'ملغي'],
      default: 'مسودة',
    },
    // ── Return Tracking ──
    returnTracking: {
      expectedReturnDate: { type: Date },
      actualReturnDate: { type: Date },
      returnStatus: {
        type: String,
        enum: ['لم يسافر', 'مسافر', 'عاد في الموعد', 'متأخر', 'لم يعد'],
      },
      delayNotificationSent: { type: Boolean, default: false },
      delayDays: { type: Number, default: 0 },
    },
    // ── Meta ──
    notes: { type: String },
    attachments: [
      {
        name: { type: String },
        fileUrl: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtuals ──
ExitReentryVisaSchema.virtual('daysUntilExpiry').get(function () {
  if (!this.expiryDate) return null;
  return Math.ceil((this.expiryDate - new Date()) / (1000 * 60 * 60 * 24));
});

ExitReentryVisaSchema.virtual('isExpired').get(function () {
  return this.expiryDate && new Date() > this.expiryDate;
});

// ── Pre-save ──
ExitReentryVisaSchema.pre('save', function (next) {
  // Auto total fee
  if (this.fees) {
    this.fees.totalFee =
      (this.fees.visaFee || 0) + (this.fees.insuranceFee || 0) + (this.fees.serviceFee || 0);
  }

  // Auto-generate number
  if (!this.visaRequestNumber) {
    const y = new Date().getFullYear();
    const r = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
    this.visaRequestNumber = `EVR-${y}-${r}`;
  }
  next();
});

// ── Indexes ──
ExitReentryVisaSchema.index({ employeeId: 1, status: 1 });
ExitReentryVisaSchema.index({ expiryDate: 1, status: 1 });
ExitReentryVisaSchema.index({ 'returnTracking.returnStatus': 1 });

module.exports = mongoose.model('ExitReentryVisa', ExitReentryVisaSchema);
