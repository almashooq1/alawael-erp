const mongoose = require('mongoose');

const employmentContractSchema = new mongoose.Schema(
  {
    contract_number: { type: String, unique: true },
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    contract_type: {
      type: String,
      enum: ['permanent', 'fixed_term', 'part_time', 'probation', 'renewal'],
      required: true,
    },
    start_date: { type: Date, required: true },
    end_date: { type: Date },
    probation_end_date: { type: Date },
    position: { type: String, required: true },
    department: { type: String, required: true },
    basic_salary: { type: Number, required: true },
    housing_allowance: { type: Number, default: 0 },
    transport_allowance: { type: Number, default: 0 },
    other_allowances: { type: Number, default: 0 },
    working_hours_per_week: { type: Number, default: 48 },
    working_days: {
      type: [String],
      default: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
    },
    annual_leave_days: { type: Number, default: 21 },
    contract_file_path: { type: String },
    status: { type: String, enum: ['active', 'expired', 'terminated', 'draft'], default: 'active' },
    signed_by_employee: { type: Boolean, default: false },
    signed_by_employer: { type: Boolean, default: false },
    signed_at: { type: Date },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

employmentContractSchema.pre('save', async function (next) {
  if (!this.contract_number) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      contract_number: new RegExp(`^EMP-CONTRACT-${year}-`),
    });
    this.contract_number = `EMP-CONTRACT-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

employmentContractSchema.virtual('is_expired').get(function () {
  if (!this.end_date) return false;
  return new Date() > this.end_date;
});

employmentContractSchema.virtual('days_until_expiry').get(function () {
  if (!this.end_date) return null;
  return Math.ceil((this.end_date - new Date()) / (1000 * 60 * 60 * 24));
});

employmentContractSchema.index({ employee_id: 1, status: 1 });
employmentContractSchema.index({ branch_id: 1 });
employmentContractSchema.index({ end_date: 1 });
employmentContractSchema.index({ deleted_at: 1 });

module.exports =
  mongoose.models.EmploymentContract ||
  mongoose.model('EmploymentContract', employmentContractSchema);
