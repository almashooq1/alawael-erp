/**
 * Payroll Model - Advanced Payroll System
 * نموذج الرواتب - نظام الرواتب المتقدم
 */

const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
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

    // الراتب الأساسي والمزايا
    baseSalary: Number,
    allowances: [
      {
        name: String,
        amount: Number,
        type: String, // housing, transportation, performance, etc.
      },
    ],

    // الخصومات
    deductions: [
      {
        name: String,
        amount: Number,
        type: String, // tax, insurance, loan, etc.
      },
    ],

    // الحسابات
    totalGross: Number,
    totalDeductions: Number,
    totalNet: Number,

    // تفاصيل الحضور
    attendance: {
      presentDays: Number,
      absentDays: Number,
      leaveDays: Number,
      workingDays: Number,
      overtime: Number,
    },

    // الحوافز والعقوبات
    bonuses: [
      {
        name: String,
        amount: Number,
        reason: String,
      },
    ],
    penalties: [
      {
        name: String,
        amount: Number,
        reason: String,
      },
    ],

    // حالة الدفع
    paymentStatus: {
      type: String,
      enum: ['pending', 'processed', 'transferred', 'paid'],
      default: 'pending',
    },
    paymentDate: Date,
    paymentMethod: String,

    // الضرائب والتأمين
    taxes: {
      incomeTax: Number,
      socialSecurity: Number,
      healthInsurance: Number,
    },

    // ملاحظات
    notes: String,
    approvedBy: String,
    approvalDate: Date,

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: 'payrolls',
  },
);

payrollSchema.index({ employeeId: 1, month: 1 }, { unique: true });
payrollSchema.index({ month: 1, paymentStatus: 1 });

// Methods

/**
 * حساب الراتب الإجمالي
 */
payrollSchema.methods.calculateTotalSalary = function () {
  let gross = this.baseSalary;

  if (this.allowances) {
    this.allowances.forEach(allowance => {
      gross += allowance.amount;
    });
  }

  if (this.bonuses) {
    this.bonuses.forEach(bonus => {
      gross += bonus.amount;
    });
  }

  this.totalGross = gross;
  return gross;
};

/**
 * حساب الخصومات الإجمالية
 */
payrollSchema.methods.calculateTotalDeductions = function () {
  let deductions = 0;

  if (this.deductions) {
    this.deductions.forEach(deduction => {
      deductions += deduction.amount;
    });
  }

  if (this.penalties) {
    this.penalties.forEach(penalty => {
      deductions += penalty.amount;
    });
  }

  if (this.taxes) {
    deductions += this.taxes.incomeTax || 0;
    deductions += this.taxes.socialSecurity || 0;
    deductions += this.taxes.healthInsurance || 0;
  }

  this.totalDeductions = deductions;
  return deductions;
};

/**
 * حساب الراتب الصافي
 */
payrollSchema.methods.calculateNetSalary = function () {
  const gross = this.calculateTotalSalary();
  const deductions = this.calculateTotalDeductions();
  this.totalNet = gross - deductions;
  return this.totalNet;
};

/**
 * إرسال للدفع
 */
payrollSchema.methods.submitForApproval = function (approver) {
  this.paymentStatus = 'processed';
  this.approvedBy = approver;
  this.approvalDate = new Date();
  return this.save();
};

/**
 * تأكيد الدفع
 */
payrollSchema.methods.confirmPayment = function (method = 'bank') {
  this.paymentStatus = 'transferred';
  this.paymentMethod = method;
  this.paymentDate = new Date();
  return this.save();
};

// Statics

/**
 * الحصول على كشف الرواتب الشهري
 */
payrollSchema.statics.getMonthlyPayroll = function (month) {
  return this.find({ month }).populate('employeeId');
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
