const mongoose = require('mongoose');

const payrollRecordSchema = new mongoose.Schema(
  {
    payroll_number: { type: String, unique: true },
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    working_days: { type: Number, default: 26 },
    actual_days: { type: Number, default: 26 },
    // المستحقات
    basic_salary: { type: Number, default: 0 },
    housing_allowance: { type: Number, default: 0 },
    transport_allowance: { type: Number, default: 0 },
    other_allowances: { type: Number, default: 0 },
    overtime_pay: { type: Number, default: 0 },
    overtime_hours: { type: Number, default: 0 },
    gross_salary: { type: Number, default: 0 },
    // الاستقطاعات
    gosi_employee: { type: Number, default: 0 }, // 9% سعودي / 2% غير سعودي
    saned_deduction: { type: Number, default: 0 }, // ساند 0.75%
    late_deduction: { type: Number, default: 0 },
    absence_deduction: { type: Number, default: 0 },
    advance_deduction: { type: Number, default: 0 },
    other_deductions: { type: Number, default: 0 },
    total_deductions: { type: Number, default: 0 },
    // صاحب العمل
    gosi_employer: { type: Number, default: 0 }, // 12% سعودي / 2% غير سعودي
    // الصافي
    net_salary: { type: Number, default: 0 },
    // الحالة
    status: { type: String, enum: ['draft', 'approved', 'paid', 'cancelled'], default: 'draft' },
    payment_date: { type: Date },
    payment_method: {
      type: String,
      enum: ['bank_transfer', 'cash', 'wps'],
      default: 'bank_transfer',
    },
    bank_reference: { type: String },
    notes: { type: String },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approved_at: { type: Date },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

payrollRecordSchema.pre('save', async function (next) {
  if (!this.payroll_number) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      payroll_number: new RegExp(`^PAY-${year}-`),
    });
    this.payroll_number = `PAY-${year}-${String(count + 1).padStart(6, '0')}`;
  }
  // حساب تلقائي
  this.gross_salary =
    this.basic_salary +
    this.housing_allowance +
    this.transport_allowance +
    this.other_allowances +
    this.overtime_pay;
  this.total_deductions =
    this.gosi_employee +
    this.saned_deduction +
    this.late_deduction +
    this.absence_deduction +
    this.advance_deduction +
    this.other_deductions;
  this.net_salary = this.gross_salary - this.total_deductions;
  next();
});

payrollRecordSchema.index({ employee_id: 1, year: 1, month: 1 }, { unique: true });
payrollRecordSchema.index({ branch_id: 1, year: 1, month: 1 });
payrollRecordSchema.index({ status: 1 });
payrollRecordSchema.index({ deleted_at: 1 });

module.exports =
  mongoose.models.PayrollRecord || mongoose.model('PayrollRecord', payrollRecordSchema);
