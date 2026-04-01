const mongoose = require('mongoose');

const endOfServiceSchema = new mongoose.Schema(
  {
    eos_number: { type: String, unique: true },
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    hire_date: { type: Date, required: true },
    termination_date: { type: Date, required: true },
    termination_reason: {
      type: String,
      enum: [
        'resignation',
        'employer_termination',
        'mutual_agreement',
        'contract_expiry',
        'death',
        'retirement',
      ],
      required: true,
    },
    service_years: { type: Number },
    service_months: { type: Number },
    service_days: { type: Number },
    last_basic_salary: { type: Number, required: true },
    // مكافأة نهاية الخدمة حسب نظام العمل السعودي
    // استقالة: <2سنة = 0% / 2-5سنوات = 33% / 5-10سنوات = 66% / >10سنوات = 100%
    // إنهاء من صاحب العمل: 100% في جميع الحالات
    eos_entitlement_percentage: { type: Number }, // نسبة الاستحقاق
    eos_per_year: { type: Number }, // مكافأة سنة واحدة = basic_salary * 1
    eos_amount: { type: Number }, // إجمالي المكافأة
    // مستحقات إضافية
    unpaid_salary: { type: Number, default: 0 },
    unpaid_leave_days: { type: Number, default: 0 },
    unpaid_leave_amount: { type: Number, default: 0 },
    overtime_owed: { type: Number, default: 0 },
    other_dues: { type: Number, default: 0 },
    total_dues: { type: Number, default: 0 },
    // الخصومات
    advances_deduction: { type: Number, default: 0 },
    other_deductions: { type: Number, default: 0 },
    total_deductions: { type: Number, default: 0 },
    net_payment: { type: Number, default: 0 },
    // الحالة
    status: { type: String, enum: ['draft', 'approved', 'paid'], default: 'draft' },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approved_at: { type: Date },
    payment_date: { type: Date },
    notes: { type: String },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

endOfServiceSchema.pre('save', async function (next) {
  if (!this.eos_number) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      eos_number: new RegExp(`^EOS-${year}-`),
    });
    this.eos_number = `EOS-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  // حساب مدة الخدمة
  if (this.hire_date && this.termination_date) {
    const diffMs = this.termination_date - this.hire_date;
    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    this.service_years = Math.floor(totalDays / 365);
    this.service_months = Math.floor((totalDays % 365) / 30);
    this.service_days = totalDays % 30;
    const yearsDecimal = totalDays / 365;
    // حساب نسبة الاستحقاق
    if (
      this.termination_reason === 'employer_termination' ||
      this.termination_reason === 'mutual_agreement' ||
      this.termination_reason === 'contract_expiry' ||
      this.termination_reason === 'death' ||
      this.termination_reason === 'retirement'
    ) {
      this.eos_entitlement_percentage = 100;
    } else {
      // استقالة
      if (yearsDecimal < 2) this.eos_entitlement_percentage = 0;
      else if (yearsDecimal < 5) this.eos_entitlement_percentage = 33;
      else if (yearsDecimal < 10) this.eos_entitlement_percentage = 66;
      else this.eos_entitlement_percentage = 100;
    }
    // مكافأة سنة = راتب شهر للسنوات 1-5، ونصف راتب للسنوات الإضافية
    const salary = this.last_basic_salary || 0;
    const fullYears = Math.floor(yearsDecimal);
    const first5 = Math.min(fullYears, 5);
    const beyond5 = Math.max(0, fullYears - 5);
    const rawEos = first5 * salary + beyond5 * (salary / 2);
    this.eos_per_year = salary;
    this.eos_amount = rawEos * (this.eos_entitlement_percentage / 100);
    // إجمالي المستحقات
    this.unpaid_leave_amount = this.unpaid_leave_days * (salary / 30);
    this.total_dues =
      this.eos_amount +
      this.unpaid_salary +
      this.unpaid_leave_amount +
      this.overtime_owed +
      this.other_dues;
    this.total_deductions = this.advances_deduction + this.other_deductions;
    this.net_payment = this.total_dues - this.total_deductions;
  }
  next();
});

endOfServiceSchema.index({ employee_id: 1 });
endOfServiceSchema.index({ branch_id: 1, status: 1 });
endOfServiceSchema.index({ deleted_at: 1 });

module.exports = mongoose.model('EndOfServiceCalculation', endOfServiceSchema);
