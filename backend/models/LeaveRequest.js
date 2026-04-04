/**
 * LeaveRequest — طلبات الإجازات والاستئذانات
 * النظام 37: الحضور البيومتري ZKTeco
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const leaveRequestSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    leaveType: {
      type: String,
      required: true,
      enum: ['annual', 'sick', 'emergency', 'maternity', 'paternity', 'study', 'hajj', 'unpaid'],
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    daysCount: { type: Number, default: 1 },
    hoursCount: { type: Number, default: null },
    startTime: { type: String, default: null },
    // HH:MM
    endTime: { type: String, default: null },
    // HH:MM
    reason: { type: String, required: true, maxlength: 500 },
    notes: { type: String, default: null, maxlength: 1000 },
    status: {
      type: String,
      default: 'pending',
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      index: true,
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },
    attachmentPath: { type: String, default: null },
    isDeducted: { type: Boolean, default: false },
    balanceBefore: { type: Number, default: null },
    balanceAfter: { type: Number, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

leaveRequestSchema.index({ employeeId: 1, status: 1 });
leaveRequestSchema.index({ startDate: 1, endDate: 1 });
leaveRequestSchema.index({ status: 1 });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
