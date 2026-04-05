/**
 * LeaveBalance — أرصدة الإجازات
 * النظام 37: الحضور البيومتري ZKTeco
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const leaveBalanceSchema = new Schema(
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
    year: { type: Number, required: true },
    entitlement: { type: Number, default: 0 },
    // الاستحقاق السنوي
    used: { type: Number, default: 0 },
    // المستخدم
    pending: { type: Number, default: 0 },
    // في الانتظار
    balance: { type: Number, default: 0 },
    // الرصيد المتبقي
    carriedForward: { type: Number, default: 0 },
    // المرحّل من العام السابق
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

leaveBalanceSchema.index({ employeeId: 1, year: 1 });
leaveBalanceSchema.index({ employeeId: 1, leaveType: 1, year: 1, branchId: 1 }, { unique: true });

module.exports = mongoose.models.LeaveBalance || mongoose.model('LeaveBalance', leaveBalanceSchema);
