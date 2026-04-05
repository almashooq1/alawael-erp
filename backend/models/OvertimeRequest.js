/**
 * OvertimeRequest — طلبات الوقت الإضافي
 * النظام 37: الحضور البيومتري ZKTeco
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const overtimeRequestSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    overtimeDate: { type: Date, required: true },
    startTime: { type: String, required: true },
    // HH:MM:SS
    endTime: { type: String, required: true },
    durationMinutes: { type: Number, required: true },
    type: {
      type: String,
      default: 'regular',
      enum: ['regular', 'weekend', 'holiday'],
    },
    rateMultiplier: { type: Number, default: 1.5 },
    // معامل الوقت الإضافي
    amount: { type: Number, default: 0 },
    reason: { type: String, required: true },
    status: {
      type: String,
      default: 'pending',
      enum: ['pending', 'approved', 'rejected', 'paid'],
      index: true,
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    isPaid: { type: Boolean, default: false },
    payrollId: { type: Schema.Types.ObjectId, ref: 'Payroll', default: null },
    notes: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

overtimeRequestSchema.index({ employeeId: 1, overtimeDate: 1 });
overtimeRequestSchema.index({ status: 1 });

module.exports =
  mongoose.models.OvertimeRequest || mongoose.model('OvertimeRequest', overtimeRequestSchema);
