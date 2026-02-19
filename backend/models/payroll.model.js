/**
 * Payroll Model - Advanced Payroll System
 * نموذج الرواتب - نظام الرواتب المتقدم
 */

const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema(
  {
    // معرفات أساسية
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    employeeName: String,
    employeeEmail: String,
    departmentId: mongoose.Schema.Types.ObjectId,
    departmentName: String,

    // الفترة الزمنية
    month: {
      type: String,
      required: true, // YYYY-MM
      index: true,
    },
    year: {
      type: Number,
      required: true,
      index: true,
    },
    payPeriodStartDate: Date,
    payPeriodEndDate: Date,

    // ========== الراتب الأساسي والمزايا ==========
    baseSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    allowances: [
      {
        _id: mongoose.Schema.Types.ObjectId,
        name: {
          type: String,
          enum: [
            'housing',
            'transportation',
            'meal',
            'communication',
            'performance',
            'shift-differential',
            'language-bonus',
            'certificate-bonus',
            'other',
          ],
        },
        amount: { type: Number, min: 0 },
        isFixed: { type: Boolean, default: true },
        description: String,
      },
    ],

    // ========== الخصومات ==========
    deductions: [
      {
        _id: mongoose.Schema.Types.ObjectId,
        name: {
          type: String,
          enum: [
            'income-tax',
            'social-security',
            'health-insurance',
            'life-insurance',
            'loan-deduction',
            'employee-advance',
            'uniform-cost',
            'disciplinary-penalty',
            'other',
          ],
        },
        amount: { type: Number, min: 0 },
        percentage: { type: Number, min: 0, max: 100 },
        calculationType: {
          type: String,
          enum: ['fixed', 'percentage', 'tiered'],
          default: 'fixed',
        },
        isFixed: { type: Boolean, default: false },
        description: String,
      },
    ],

    // ========== الحضور والعمل الإضافي ==========
    attendance: {
      presentDays: { type: Number, min: 0, default: 0 },
      absentDays: { type: Number, min: 0, default: 0 },
      leaveDays: { type: Number, min: 0, default: 0 },
      unpaidLeaveDays: { type: Number, min: 0, default: 0 },
      workingDays: { type: Number, min: 0, default: 22 }, // يوم عمل قياسي
      actualWorkingDays: Number,
      overtime: {
        regularOvertime: { type: Number, min: 0, default: 0 }, // x1.5
        weekendOvertime: { type: Number, min: 0, default: 0 }, // x2
        holidayOvertime: { type: Number, min: 0, default: 0 }, // x3
      },
      lateArrivals: { type: Number, min: 0, default: 0 },
      earlyDepartures: { type: Number, min: 0, default: 0 },
    },

    // ========== الحوافز والعقوبات ==========
    incentives: {
      performanceBonus: { type: Number, min: 0, default: 0 },
      attendanceBonus: { type: Number, min: 0, default: 0 },
      safetyBonus: { type: Number, min: 0, default: 0 },
      loyaltyBonus: { type: Number, min: 0, default: 0 },
      projectBonus: { type: Number, min: 0, default: 0 },
      seasonalBonus: { type: Number, min: 0, default: 0 },
      other: [
        {
          name: String,
          amount: Number,
          reason: String,
          approvedBy: String,
        },
      ],
    },

    penalties: {
      disciplinary: { type: Number, min: 0, default: 0 },
      attendance: { type: Number, min: 0, default: 0 },
      misconduct: { type: Number, min: 0, default: 0 },
      other: [
        {
          name: String,
          amount: Number,
          reason: String,
          approvedBy: String,
        },
      ],
    },

    // ========== الحسابات ==========
    calculations: {
      totalAllowances: { type: Number, default: 0 },
      totalIncentives: { type: Number, default: 0 },
      totalPenalties: { type: Number, default: 0 },
      totalGross: { type: Number, default: 0 },
      totalDeductions: { type: Number, default: 0 },
      totalNet: { type: Number, default: 0 },
      netPayable: { type: Number, default: 0 },
      lastCalculatedAt: Date,
    },

    // ========== الضرائب والتأمينات ==========
    taxes: {
      incomeTax: { type: Number, min: 0, default: 0 },
      incomeTaxPercentage: { type: Number, min: 0, max: 100, default: 0 },
      socialSecurity: { type: Number, min: 0, default: 0 },
      socialSecurityPercentage: { type: Number, min: 0, max: 100, default: 0 },
      healthInsurance: { type: Number, min: 0, default: 0 },
      healthInsurancePercentage: { type: Number, min: 0, max: 100, default: 0 },
      gosi: { type: Number, min: 0, default: 0 }, // General Organization for Social Insurance (Saudi)
      taxableIncome: Number,
      taxBracket: String, // e.g., "20%-25%"
    },

    // ========== معلومات الدفع ==========
    payment: {
      status: {
        type: String,
        enum: ['draft', 'pending-approval', 'approved', 'processed', 'transferred', 'paid', 'cancelled'],
        default: 'draft',
        index: true,
      },
      paymentDate: Date,
      transferDate: Date,
      paymentMethod: {
        type: String,
        enum: ['bank-transfer', 'check', 'cash', 'crypto'],
        default: 'bank-transfer',
      },
      bankAccount: String,
      bankName: String,
      transactionReference: String,
      remarks: String,
    },

    // ========== الموافقات ==========
    approvals: {
      preparedBy: {
        userId: mongoose.Schema.Types.ObjectId,
        name: String,
        date: Date,
      },
      reviewedBy: {
        userId: mongoose.Schema.Types.ObjectId,
        name: String,
        date: Date,
      },
      approvedBy: {
        userId: mongoose.Schema.Types.ObjectId,
        name: String,
        date: Date,
      },
      finalizedBy: {
        userId: mongoose.Schema.Types.ObjectId,
        name: String,
        date: Date,
      },
    },

    // ========== التفاصيل الإضافية ==========
    notes: String,
    payslipRemarks: String,
    internalNotes: String,

    // ========== التدقيق والتتبع ==========
    audit: {
      createdBy: mongoose.Schema.Types.ObjectId,
      modifiedBy: mongoose.Schema.Types.ObjectId,
      modificationCount: { type: Number, default: 0 },
      lastModifiedAt: Date,
      isLocked: { type: Boolean, default: false },
      lockedAt: Date,
      lockedBy: mongoose.Schema.Types.ObjectId,
    },

    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: 'payrolls',
  }
);

// ========== المؤشرات (Indexes) ==========
payrollSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });
payrollSchema.index({ month: 1, year: 1, 'payment.status': 1 });
payrollSchema.index({ departmentId: 1, month: 1, year: 1 });
payrollSchema.index({ 'payment.status': 1, createdAt: -1 });
payrollSchema.index({ employeeEmail: 1 });

// ========== الطرق (Instance Methods) ==========

/**
 * حساب إجمالي المزايا
 */
payrollSchema.methods.calculateTotalAllowances = function () {
  let total = 0;
  if (this.allowances && this.allowances.length > 0) {
    total = this.allowances.reduce((sum, allowance) => sum + (allowance.amount || 0), 0);
  }
  this.calculations.totalAllowances = total;
  return total;
};

/**
 * حساب إجمالي الحوافز
 */
payrollSchema.methods.calculateTotalIncentives = function () {
  let total = 0;
  const incentives = this.incentives || {};

  total += incentives.performanceBonus || 0;
  total += incentives.attendanceBonus || 0;
  total += incentives.safetyBonus || 0;
  total += incentives.loyaltyBonus || 0;
  total += incentives.projectBonus || 0;
  total += incentives.seasonalBonus || 0;

  if (incentives.other && incentives.other.length > 0) {
    total += incentives.other.reduce((sum, item) => sum + (item.amount || 0), 0);
  }

  this.calculations.totalIncentives = total;
  return total;
};

/**
 * حساب إجمالي العقوبات
 */
payrollSchema.methods.calculateTotalPenalties = function () {
  let total = 0;
  const penalties = this.penalties || {};

  total += penalties.disciplinary || 0;
  total += penalties.attendance || 0;
  total += penalties.misconduct || 0;

  if (penalties.other && penalties.other.length > 0) {
    total += penalties.other.reduce((sum, item) => sum + (item.amount || 0), 0);
  }

  this.calculations.totalPenalties = total;
  return total;
};

/**
 * حساب الراتب الإجمالي (الأساسي + المزايا + الحوافز)
 */
payrollSchema.methods.calculateTotalGross = function () {
  const baseSalary = this.baseSalary || 0;
  const allowances = this.calculateTotalAllowances();
  const incentives = this.calculateTotalIncentives();
  const penalties = this.calculateTotalPenalties();

  const gross = baseSalary + allowances + incentives - penalties;
  this.calculations.totalGross = gross;
  return gross;
};

/**
 * حساب إجمالي الخصومات (ضرائب + تأمينات + خصومات أخرى)
 */
payrollSchema.methods.calculateTotalDeductions = function () {
  let total = 0;
  const taxes = this.taxes || {};
  const deductions = this.deductions || [];

  // الضرائب والتأمينات
  total += taxes.incomeTax || 0;
  total += taxes.socialSecurity || 0;
  total += taxes.healthInsurance || 0;
  total += taxes.gosi || 0;

  // الخصومات الأخرى
  if (deductions && deductions.length > 0) {
    total += deductions.reduce((sum, deduction) => sum + (deduction.amount || 0), 0);
  }

  this.calculations.totalDeductions = total;
  return total;
};

/**
 * حساب الراتب الصافي (الإجمالي - الخصومات)
 */
payrollSchema.methods.calculateNetSalary = function () {
  const gross = this.calculateTotalGross();
  const deductions = this.calculateTotalDeductions();
  const net = gross - deductions;

  this.calculations.totalNet = net;
  this.calculations.netPayable = net;
  return net;
};

/**
 * حساب جميع الحسابات
 */
payrollSchema.methods.recalculateAll = function () {
  this.calculateTotalAllowances();
  this.calculateTotalIncentives();
  this.calculateTotalPenalties();
  this.calculateTotalGross();
  this.calculateTotalDeductions();
  this.calculateNetSalary();
  this.calculations.lastCalculatedAt = new Date();
  return this.calculations;
};

/**
 * إرسال للموافقة
 */
payrollSchema.methods.submitForApproval = function (userId, userName) {
  if (this.payment.status !== 'draft') {
    throw new Error('يمكن فقط إرسال مسودات لعملية الموافقة');
  }
  this.payment.status = 'pending-approval';
  this.approvals.preparedBy = {
    userId,
    name: userName,
    date: new Date(),
  };
  return this;
};

/**
 * الموافقة على الراتب
 */
payrollSchema.methods.approve = function (userId, userName) {
  if (this.payment.status !== 'pending-approval') {
    throw new Error('يجب أن تكون حالة الراتب معلقة للموافقة');
  }
  this.payment.status = 'approved';
  this.approvals.approvedBy = {
    userId,
    name: userName,
    date: new Date(),
  };
  return this;
};

/**
 * معالجة الراتب
 */
payrollSchema.methods.process = function (userId, userName) {
  if (this.payment.status !== 'approved') {
    throw new Error('يجب أن تكون الرواتب معتمدة قبل التحويل');
  }
  this.payment.status = 'processed';
  this.approvals.finalizedBy = {
    userId,
    name: userName,
    date: new Date(),
  };
  return this;
};

/**
 * تحويل الراتب
 */
payrollSchema.methods.transfer = function (transactionRef, bankName = null) {
  if (this.payment.status !== 'processed') {
    throw new Error('يجب معالجة الراتب قبل التحويل');
  }
  this.payment.status = 'transferred';
  this.payment.transferDate = new Date();
  this.payment.transactionReference = transactionRef;
  if (bankName) this.payment.bankName = bankName;
  return this;
};

/**
 * تأكيد دفع الراتب
 */
payrollSchema.methods.confirmPayment = function () {
  if (this.payment.status !== 'transferred') {
    throw new Error('يجب تحويل الراتب قبل تأكيد الدفع');
  }
  this.payment.status = 'paid';
  this.payment.paymentDate = new Date();
  return this;
};

/**
 * إلغاء الراتب
 */
payrollSchema.methods.cancel = function (reason) {
  this.payment.status = 'cancelled';
  this.payment.remarks = reason;
  return this;
};

/**
 * قفل الراتب من التعديل
 */
payrollSchema.methods.lock = function (userId) {
  this.audit.isLocked = true;
  this.audit.lockedAt = new Date();
  this.audit.lockedBy = userId;
  return this;
};

/**
 * فتح الراتب للتعديل
 */
payrollSchema.methods.unlock = function (userId) {
  this.audit.isLocked = false;
  this.audit.modifiedBy = userId;
  this.audit.modificationCount = (this.audit.modificationCount || 0) + 1;
  return this;
};

/**
 * إنشاء كشف الراتب (Payslip)
 */
payrollSchema.methods.generatePayslip = function () {
  return {
    employeeName: this.employeeName,
    employeeEmail: this.employeeEmail,
    period: `${this.month}-${this.year}`,
    baseSalary: this.baseSalary,
    allowances: this.calculations.totalAllowances,
    incentives: this.calculations.totalIncentives,
    penalties: this.calculations.totalPenalties,
    grossSalary: this.calculations.totalGross,
    deductions: this.calculations.totalDeductions,
    netSalary: this.calculations.totalNet,
    paymentDate: this.payment.paymentDate,
    paymentMethod: this.payment.paymentMethod,
  };
};

// ========== الطرق الثابتة (Static Methods) ==========

/**
 * الحصول على كشف الرواتب الشهري
 */
payrollSchema.statics.getMonthlyPayroll = function (month, year = null) {
  const query = { month };
  if (year) query.year = year;
  return this.find(query)
    .populate('employeeId', 'fullName email')
    .sort({ departmentName: 1, employeeName: 1 });
};

/**
 * الحصول على رواتب الموظف
 */
payrollSchema.statics.getEmployeePayrolls = function (employeeId, year = null) {
  const query = { employeeId };
  if (year) query.year = year;
  return this.find(query).sort({ month: -1 });
};

/**
 * حساب إجمالي الرواتب الشهرية
 */
payrollSchema.statics.getMonthlyTotal = function (month, year = null) {
  const query = { month };
  if (year) query.year = year;
  return this.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalGross: { $sum: '$calculations.totalGross' },
        totalDeductions: { $sum: '$calculations.totalDeductions' },
        totalNet: { $sum: '$calculations.totalNet' },
        employeeCount: { $sum: 1 },
      },
    },
  ]);
};

/**
 * حساب إجمالي الرواتب حسب القسم
 */
payrollSchema.statics.getSalaryByDepartment = function (month, year = null) {
  const query = { month };
  if (year) query.year = year;
  return this.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$departmentName',
        totalGross: { $sum: '$calculations.totalGross' },
        totalNet: { $sum: '$calculations.totalNet' },
        employeeCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

/**
 * الحصول على الرواتب المعلقة
 */
payrollSchema.statics.getPendingPayrolls = function () {
  return this.find({
    $or: [
      { 'payment.status': 'draft' },
      { 'payment.status': 'pending-approval' },
      { 'payment.status': 'approved' },
    ],
  }).sort({ createdAt: -1 });
};

/**
 * الحصول على إحصائيات الرواتب
 */
payrollSchema.statics.getPayrollStatistics = function (month, year = null) {
  const query = { month };
  if (year) query.year = year;
  return this.aggregate([
    { $match: query },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              totalGross: { $sum: '$calculations.totalGross' },
              totalDeductions: { $sum: '$calculations.totalDeductions' },
              totalNet: { $sum: '$calculations.totalNet' },
              totalIncentives: { $sum: '$calculations.totalIncentives' },
              totalPenalties: { $sum: '$calculations.totalPenalties' },
              count: { $sum: 1 },
              avgGross: { $avg: '$calculations.totalGross' },
            },
          },
        ],
        byStatus: [
          {
            $group: {
              _id: '$payment.status',
              count: { $sum: 1 },
            },
          },
        ],
      },
    },
  ]);
};

/**
 * إجمالي الرواتب للشهر
 */
payrollSchema.statics.getMonthlyTotalPayroll = async function (month) {
  const results = await this.aggregate([
    { $match: { month } },
    {
      $group: {
        _id: null,
        totalGross: { $sum: '$totalGross' },
        totalDeductions: { $sum: '$totalDeductions' },
        totalNet: { $sum: '$totalNet' },
        employeeCount: { $sum: 1 },
      },
    },
  ]);
  return results[0] || { totalGross: 0, totalDeductions: 0, totalNet: 0, employeeCount: 0 };
};

module.exports = mongoose.model('Payroll', payrollSchema);
