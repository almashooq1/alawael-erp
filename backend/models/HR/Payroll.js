/**
 * Payroll Model (HR)
 * Modular, extensible payroll record for HR system
 */
const mongoose = require('mongoose');

const PayrollSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    month: { type: String, required: true, index: true }, // YYYY-MM
    year: { type: Number, required: true, index: true },
    baseSalary: Number,
    allowances: [
      {
        name: String,
        amount: Number,
        type: String,
      },
    ],
    deductions: [
      {
        name: String,
        amount: Number,
        type: String,
      },
    ],
    totalGross: Number,
    totalDeductions: Number,
    totalNet: Number,
    attendance: {
      presentDays: Number,
      absentDays: Number,
      leaveDays: Number,
      workingDays: Number,
      overtime: Number,
    },
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
    paymentStatus: {
      type: String,
      enum: ['pending', 'processed', 'transferred', 'paid'],
      default: 'pending',
    },
    paymentDate: Date,
    paymentMethod: String,
    taxes: {
      incomeTax: Number,
      socialSecurity: Number,
      healthInsurance: Number,
    },
    notes: String,
    approvedBy: String,
    approvalDate: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: 'payrolls',
  }
);

PayrollSchema.index({ employeeId: 1, month: 1 }, { unique: true });
PayrollSchema.index({ month: 1, paymentStatus: 1 });

module.exports = mongoose.model('Payroll', PayrollSchema);
