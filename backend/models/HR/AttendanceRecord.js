const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema(
  {
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    date: { type: Date, required: true },
    scheduled_start: { type: String },
    scheduled_end: { type: String },
    check_in: { type: Date },
    check_out: { type: Date },
    check_in_method: {
      type: String,
      enum: ['fingerprint', 'card', 'manual', 'mobile'],
      default: 'manual',
    },
    check_out_method: {
      type: String,
      enum: ['fingerprint', 'card', 'manual', 'mobile'],
      default: 'manual',
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'early_leave', 'on_leave', 'holiday', 'remote', 'sick'],
      default: 'absent',
    },
    late_minutes: { type: Number, default: 0 },
    early_leave_minutes: { type: Number, default: 0 },
    overtime_minutes: { type: Number, default: 0 },
    total_hours: { type: Number, default: 0 },
    deduction_applied: { type: Boolean, default: false },
    deduction_amount: { type: Number, default: 0 },
    notes: { type: String },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

attendanceRecordSchema.virtual('worked_hours').get(function () {
  if (!this.check_in || !this.check_out) return 0;
  return ((this.check_out - this.check_in) / (1000 * 60 * 60)).toFixed(2);
});

attendanceRecordSchema.index({ employee_id: 1, date: -1 });
attendanceRecordSchema.index({ branch_id: 1, date: -1 });
attendanceRecordSchema.index({ status: 1 });
attendanceRecordSchema.index({ deleted_at: 1 });

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);
