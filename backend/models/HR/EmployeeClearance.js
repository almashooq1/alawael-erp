/**
 * Employee Clearance & Offboarding Model — إخلاء الطرف
 * Multi-department clearance workflow for departing employees
 * Auto-generates final settlement and experience certificate
 */
const mongoose = require('mongoose');

const ClearanceItemSchema = new mongoose.Schema(
  {
    department: {
      type: String,
      enum: [
        'الموارد البشرية',
        'تقنية المعلومات',
        'المالية',
        'الشؤون الإدارية',
        'العهد والممتلكات',
        'السكن',
        'أمن المنشأة',
        'القسم المباشر',
        'الشؤون القانونية',
        'المكتبة/التوثيق',
      ],
      required: true,
    },
    label: { type: String, required: true },
    description: { type: String },
    status: {
      type: String,
      enum: ['معلّق', 'قيد المعالجة', 'مُخلى', 'يوجد ملاحظات', 'مرفوض'],
      default: 'معلّق',
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    clearedDate: { type: Date },
    notes: { type: String },
    pendingItems: [{ type: String }], // items blocking clearance
    attachments: [
      {
        name: { type: String },
        fileUrl: { type: String },
      },
    ],
  },
  { timestamps: true }
);

const EmployeeClearanceSchema = new mongoose.Schema(
  {
    clearanceNumber: {
      type: String,
      unique: true,
      required: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    // ── Departure Info ──
    departureType: {
      type: String,
      enum: ['استقالة', 'انتهاء عقد', 'فصل', 'تقاعد', 'وفاة', 'نقل', 'إنهاء فترة تجربة'],
      required: true,
    },
    lastWorkingDay: { type: Date, required: true },
    resignationDate: { type: Date },
    noticePeriodDays: { type: Number },
    noticePeriodServed: { type: Boolean, default: false },
    // ── Clearance Checklist ──
    items: [ClearanceItemSchema],
    // ── HR Checklist ──
    hrChecklist: {
      leaveBalanceSettled: { type: Boolean, default: false },
      remainingLeaveDays: { type: Number, default: 0 },
      leavePayout: { type: Number, default: 0 },
      loansSettled: { type: Boolean, default: false },
      outstandingLoanAmount: { type: Number, default: 0 },
      experienceCertificateIssued: { type: Boolean, default: false },
      experienceCertificateDate: { type: Date },
      gosiDeregistered: { type: Boolean, default: false },
      medicalInsuranceCancelled: { type: Boolean, default: false },
      iqamaTransferOrCancel: {
        type: String,
        enum: ['غير مطلوب', 'نقل كفالة', 'خروج نهائي', 'تم'],
      },
      exitReentryIssued: { type: Boolean, default: false },
      finalExitVisaIssued: { type: Boolean, default: false },
    },
    // ── IT Checklist ──
    itChecklist: {
      emailDeactivated: { type: Boolean, default: false },
      systemAccessRevoked: { type: Boolean, default: false },
      devicesReturned: { type: Boolean, default: false },
      dataBackedUp: { type: Boolean, default: false },
      vpnRevoked: { type: Boolean, default: false },
    },
    // ── Finance Checklist ──
    financeChecklist: {
      advancesSettled: { type: Boolean, default: false },
      expenseClaimsProcessed: { type: Boolean, default: false },
      creditCardReturned: { type: Boolean, default: false },
      finalPaymentCalculated: { type: Boolean, default: false },
    },
    // ── Final Settlement ──
    finalSettlement: {
      basicSalaryDue: { type: Number, default: 0 },
      leaveEncashment: { type: Number, default: 0 },
      endOfServiceBenefit: { type: Number, default: 0 },
      unpaidOvertime: { type: Number, default: 0 },
      otherBenefits: { type: Number, default: 0 },
      totalGross: { type: Number, default: 0 },
      deductions: {
        outstandingLoans: { type: Number, default: 0 },
        unreturnedAssets: { type: Number, default: 0 },
        penalties: { type: Number, default: 0 },
        noticePeriodDeduction: { type: Number, default: 0 },
        otherDeductions: { type: Number, default: 0 },
        totalDeductions: { type: Number, default: 0 },
      },
      netPayable: { type: Number, default: 0 },
      calculatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      calculationDate: { type: Date },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      approvalDate: { type: Date },
      paidDate: { type: Date },
    },
    // ── Exit Interview ──
    exitInterview: {
      conducted: { type: Boolean, default: false },
      conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      date: { type: Date },
      reasonForLeaving: { type: String },
      feedback: { type: String },
      wouldReturn: { type: Boolean },
      overallRating: { type: Number, min: 1, max: 5 },
    },
    // ── Status ──
    status: {
      type: String,
      enum: ['بُدء', 'قيد المعالجة', 'مكتمل جزئياً', 'مكتمل', 'ملغي'],
      default: 'بُدء',
    },
    overallProgress: { type: Number, default: 0, min: 0, max: 100 },
    // ── Meta ──
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completedDate: { type: Date },
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
EmployeeClearanceSchema.virtual('isComplete').get(function () {
  return this.items?.every(item => item.status === 'مُخلى');
});

EmployeeClearanceSchema.virtual('pendingDepartments').get(function () {
  return this.items?.filter(item => item.status !== 'مُخلى').map(i => i.department) || [];
});

// ── Pre-save ──
EmployeeClearanceSchema.pre('save', function (next) {
  // Auto calculate progress
  if (this.items?.length > 0) {
    const cleared = this.items.filter(i => i.status === 'مُخلى').length;
    this.overallProgress = Math.round((cleared / this.items.length) * 100);
    if (this.overallProgress === 100 && this.status !== 'ملغي') {
      this.status = 'مكتمل';
      if (!this.completedDate) this.completedDate = new Date();
    }
  }

  // Auto final settlement gross
  const fs = this.finalSettlement;
  if (fs) {
    fs.totalGross =
      (fs.basicSalaryDue || 0) +
      (fs.leaveEncashment || 0) +
      (fs.endOfServiceBenefit || 0) +
      (fs.unpaidOvertime || 0) +
      (fs.otherBenefits || 0);
    const d = fs.deductions || {};
    d.totalDeductions =
      (d.outstandingLoans || 0) +
      (d.penalties || 0) +
      (d.noticePeriodDeduction || 0) +
      (d.otherDeductions || 0);
    fs.netPayable = fs.totalGross - d.totalDeductions;
  }

  // Auto-generate clearance number
  if (!this.clearanceNumber) {
    const y = new Date().getFullYear();
    const r = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
    this.clearanceNumber = `CLR-${y}-${r}`;
  }
  next();
});

// ── Indexes ──
EmployeeClearanceSchema.index({ employeeId: 1 });
EmployeeClearanceSchema.index({ status: 1 });

module.exports = mongoose.models.EmployeeClearance || mongoose.model('EmployeeClearance', EmployeeClearanceSchema);
