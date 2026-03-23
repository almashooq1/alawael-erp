/**
 * Employee Advance / Loan Model - سلف وقروض الموظفين
 * Track salary advances, personal loans, deduction schedules
 */
const mongoose = require('mongoose');

const employeeLoanSchema = new mongoose.Schema(
  {
    loanNumber: { type: String, unique: true },
    type: {
      type: String,
      enum: [
        'salary_advance',
        'personal_loan',
        'emergency_loan',
        'housing_loan',
        'education_loan',
        'other',
      ],
      required: true,
    },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    employeeName: { type: String, required: true },
    employeeNumber: { type: String },
    department: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'SAR' },
    disbursementDate: { type: Date },
    disbursementMethod: {
      type: String,
      enum: ['bank_transfer', 'cheque', 'cash', 'salary_deduction'],
      default: 'bank_transfer',
    },
    totalInstallments: { type: Number, default: 1 },
    installmentAmount: { type: Number },
    paidInstallments: { type: Number, default: 0 },
    remainingBalance: { type: Number },
    deductionStartDate: { type: Date },
    interestRate: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'disbursed', 'active', 'completed', 'defaulted', 'cancelled'],
      default: 'pending',
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    reason: { type: String },
    guarantor: { type: String },
    notes: { type: String },
    installments: [
      {
        installmentNumber: Number,
        dueDate: Date,
        amount: Number,
        paidAmount: { type: Number, default: 0 },
        paidDate: Date,
        status: {
          type: String,
          enum: ['upcoming', 'due', 'paid', 'partial', 'overdue', 'skipped'],
          default: 'upcoming',
        },
        deductedFromSalary: { type: Boolean, default: false },
        reference: String,
      },
    ],
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

employeeLoanSchema.pre('save', async function (next) {
  if (!this.loanNumber) {
    const prefix = this.type === 'salary_advance' ? 'ADV' : 'LN';
    const count = await mongoose.model('EmployeeLoan').countDocuments();
    this.loanNumber = `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  if (!this.installmentAmount && this.totalInstallments > 0) {
    this.installmentAmount = Math.ceil((this.amount / this.totalInstallments) * 100) / 100;
  }
  if (this.remainingBalance === undefined || this.remainingBalance === null) {
    this.remainingBalance = this.amount;
  }
  next();
});

employeeLoanSchema.index({ organization: 1, status: 1 });
employeeLoanSchema.index({ employeeId: 1, status: 1 });
employeeLoanSchema.index({ type: 1, status: 1 });

module.exports = mongoose.models.EmployeeLoan || mongoose.model('EmployeeLoan', employeeLoanSchema);
