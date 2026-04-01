const mongoose = require('mongoose');

const leaveBalanceSchema = new mongoose.Schema(
  {
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    year: { type: Number, required: true },
    annual_entitled: { type: Number, default: 21 },
    annual_used: { type: Number, default: 0 },
    annual_remaining: { type: Number, default: 21 },
    sick_used: { type: Number, default: 0 },
    hajj_used: { type: Number, default: 0 },
    compensatory_earned: { type: Number, default: 0 },
    compensatory_used: { type: Number, default: 0 },
    carried_over_from_last_year: { type: Number, default: 0 },
    last_updated: { type: Date, default: Date.now },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

leaveBalanceSchema.virtual('compensatory_remaining').get(function () {
  return Math.max(0, this.compensatory_earned - this.compensatory_used);
});

leaveBalanceSchema.statics.getOrCreate = async function (employeeId, year) {
  let balance = await this.findOne({ employee_id: employeeId, year, deleted_at: null });
  if (!balance) {
    const Employee = mongoose.model('Employee');
    const emp = await Employee.findById(employeeId);
    const entitled =
      emp && emp.hire_date && new Date().getFullYear() - new Date(emp.hire_date).getFullYear() >= 5
        ? 30
        : 21;
    balance = await this.create({
      employee_id: employeeId,
      year,
      annual_entitled: entitled,
      annual_remaining: entitled,
    });
  }
  return balance;
};

leaveBalanceSchema.index({ employee_id: 1, year: 1 }, { unique: true });
leaveBalanceSchema.index({ deleted_at: 1 });

module.exports = mongoose.models.LeaveBalance || mongoose.model('LeaveBalance', leaveBalanceSchema);
