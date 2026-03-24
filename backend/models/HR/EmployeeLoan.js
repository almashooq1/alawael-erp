/**
 * Employee Loan Model — نموذج السلف والقروض
 *
 * Manages employee loans and salary advances with installment tracking.
 */
const mongoose = require('mongoose');

const InstallmentSchema = new mongoose.Schema({
  installmentNumber: Number,
  amount: Number,
  dueDate: Date,
  status: {
    type: String,
    enum: ['مستحق', 'مدفوع', 'متأخر', 'ملغي'],
    default: 'مستحق',
  },
  paidDate: Date,
  deductedFromPayroll: { type: Boolean, default: false },
  payrollMonth: String,
});

const EmployeeLoanSchema = new mongoose.Schema(
  {
    loanNumber: {
      type: String,
      unique: true,
      required: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    type: {
      type: String,
      enum: ['سلفة راتب', 'قرض شخصي', 'سلفة طوارئ', 'قرض سكني', 'قرض تعليمي', 'قرض طبي'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: [
        'مقدم',
        'موافقة المدير',
        'موافقة الموارد البشرية',
        'موافقة المالية',
        'معتمد',
        'تم الصرف',
        'قيد السداد',
        'مكتمل',
        'مرفوض',
      ],
      default: 'مقدم',
    },
    numberOfInstallments: {
      type: Number,
      required: true,
      min: 1,
      max: 60,
    },
    monthlyInstallment: {
      type: Number,
      required: true,
    },
    interestRate: {
      type: Number,
      default: 0,
    },
    totalRepayment: Number,
    installments: [InstallmentSchema],
    approvalWorkflow: [
      {
        step: String,
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        status: { type: String, enum: ['معلق', 'موافق', 'مرفوض'] },
        date: Date,
        notes: String,
      },
    ],
    disbursement: {
      method: { type: String, enum: ['تحويل بنكي', 'شيك', 'نقدي', 'خصم من الراتب'] },
      date: Date,
      reference: String,
      processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    },
    guarantor: {
      employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
      approvalDate: Date,
    },
    remainingBalance: Number,
    paidAmount: { type: Number, default: 0 },
    startDate: Date,
    endDate: Date,
    attachments: [
      {
        filename: String,
        path: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    notes: String,
  },
  { timestamps: true }
);

EmployeeLoanSchema.index({ employeeId: 1, status: 1 });
// loanNumber: removed — unique:true creates implicit index
EmployeeLoanSchema.index({ status: 1 });

EmployeeLoanSchema.pre('save', async function (next) {
  if (!this.loanNumber) {
    const count = await mongoose.model('EmployeeLoan').countDocuments();
    this.loanNumber = `LN-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  if (!this.totalRepayment) {
    this.totalRepayment = this.amount * (1 + this.interestRate / 100);
  }
  if (!this.remainingBalance && this.remainingBalance !== 0) {
    this.remainingBalance = this.totalRepayment;
  }
  next();
});

module.exports = mongoose.models.EmployeeLoan || mongoose.model('EmployeeLoan', EmployeeLoanSchema);
