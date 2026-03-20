/**
 * Vacation Settlement Model — تسوية الإجازات والرصيد
 * Compliant with Saudi Labor Law Article 111
 * Handles leave encashment, final settlement, and partial payouts
 */
const mongoose = require('mongoose');

const VacationSettlementSchema = new mongoose.Schema(
  {
    settlementNumber: {
      type: String,
      unique: true,
      required: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    // ── Settlement Type ──
    type: {
      type: String,
      enum: [
        'تسوية جزئية', // partial — encash some days
        'تسوية سنوية', // annual settlement
        'تسوية نهاية خدمة', // end of service
        'تسوية استقالة', // resignation
        'تسوية إنهاء عقد', // contract termination
        'تعويض إجازة', // leave compensation
      ],
      required: true,
    },
    // ── Leave Balance ──
    leaveBalance: {
      totalEntitlement: { type: Number, required: true }, // total annual days
      usedDays: { type: Number, default: 0 },
      remainingDays: { type: Number, required: true },
      carryForwardDays: { type: Number, default: 0 },
      encashableDays: { type: Number, required: true }, // days being settled
    },
    // ── Calculation ──
    calculation: {
      basicSalary: { type: Number, required: true },
      housingAllowance: { type: Number, default: 0 },
      transportAllowance: { type: Number, default: 0 },
      totalMonthlySalary: { type: Number },
      dailyRate: { type: Number }, // total / 30
      settlementDays: { type: Number, required: true },
      grossAmount: { type: Number }, // dailyRate * days
      deductions: { type: Number, default: 0 },
      netAmount: { type: Number },
    },
    // ── Period ──
    periodFrom: { type: Date },
    periodTo: { type: Date },
    settlementYear: { type: Number },
    // ── Approval Workflow ──
    status: {
      type: String,
      enum: [
        'مسودة',
        'قيد المراجعة',
        'معتمدة من المدير',
        'معتمدة من المالية',
        'صرفت',
        'مرفوضة',
        'ملغية',
      ],
      default: 'مسودة',
    },
    approvals: {
      managerApproval: {
        approved: { type: Boolean },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        date: { type: Date },
        notes: { type: String },
      },
      financeApproval: {
        approved: { type: Boolean },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        date: { type: Date },
        notes: { type: String },
      },
    },
    // ── Payment ──
    payment: {
      method: {
        type: String,
        enum: ['تحويل بنكي', 'شيك', 'نقدي', 'مع الراتب'],
      },
      reference: { type: String },
      paidDate: { type: Date },
      paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    // ── Saudi Labor Law Reference ──
    legalBasis: {
      type: String,
      default:
        'المادة 111 — نظام العمل السعودي: يستحق العامل أجراً عن أيام الإجازة المستحقة إذا ترك العمل',
    },
    // ── Meta ──
    reason: { type: String },
    notes: { type: String },
    attachments: [
      {
        name: { type: String },
        fileUrl: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Pre-save: auto calculations ──
VacationSettlementSchema.pre('save', function (next) {
  // Auto total monthly salary
  const calc = this.calculation;
  if (calc) {
    calc.totalMonthlySalary =
      (calc.basicSalary || 0) + (calc.housingAllowance || 0) + (calc.transportAllowance || 0);
    calc.dailyRate = calc.totalMonthlySalary / 30;
    calc.grossAmount = calc.dailyRate * (calc.settlementDays || 0);
    calc.netAmount = (calc.grossAmount || 0) - (calc.deductions || 0);
  }

  // Auto-generate settlement number
  if (!this.settlementNumber) {
    const y = new Date().getFullYear();
    const r = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
    this.settlementNumber = `VST-${y}-${r}`;
  }
  next();
});

// ── Indexes ──
VacationSettlementSchema.index({ employeeId: 1, status: 1 });
VacationSettlementSchema.index({ type: 1, status: 1 });
VacationSettlementSchema.index({ settlementYear: 1 });

module.exports = mongoose.model('VacationSettlement', VacationSettlementSchema);
