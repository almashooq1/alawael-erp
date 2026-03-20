/**
 * Shift Schedule Model — نموذج الورديات والجداول
 *
 * Advanced shift management with multiple shift types,
 * night-shift allowances, shift swaps, and ZKTeco integration.
 */
const mongoose = require('mongoose');

/* ── Shift Definition (template) ── */
const ShiftDefinitionSchema = new mongoose.Schema(
  {
    shiftCode: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    nameEn: String,
    type: {
      type: String,
      enum: ['صباحي', 'مسائي', 'ليلي', 'مناوبة 12 ساعة', 'مرن', 'عن بعد'],
      required: true,
    },
    startTime: { type: String, required: true }, // "08:00"
    endTime: { type: String, required: true }, // "16:00"
    breakDuration: { type: Number, default: 60 }, // minutes
    workingHours: { type: Number, required: true }, // e.g. 8
    color: { type: String, default: '#1976d2' },

    // Saudi Labor Law compliance
    nightShiftAllowance: { type: Number, default: 0 }, // % extra
    isOvernight: { type: Boolean, default: false },
    maxConsecutiveDays: { type: Number, default: 6 },

    graceMinutesLate: { type: Number, default: 15 },
    graceMinutesEarly: { type: Number, default: 10 },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ShiftDefinitionSchema.index({ shiftCode: 1 }, { unique: true });
ShiftDefinitionSchema.index({ type: 1, isActive: 1 });

/* ── Employee Shift Assignment (schedule) ── */
const ShiftAssignmentSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShiftDefinition', required: true },
    date: { type: Date, required: true },
    department: String,

    status: {
      type: String,
      enum: ['مجدول', 'حاضر', 'غائب', 'إجازة', 'مبدّل', 'ملغي'],
      default: 'مجدول',
    },

    actualCheckIn: Date,
    actualCheckOut: Date,
    isLate: { type: Boolean, default: false },
    lateMinutes: { type: Number, default: 0 },
    isEarlyLeave: { type: Boolean, default: false },
    earlyLeaveMinutes: { type: Number, default: 0 },
    workedHours: { type: Number, default: 0 },

    notes: String,
  },
  { timestamps: true }
);

ShiftAssignmentSchema.index({ employeeId: 1, date: 1 });
ShiftAssignmentSchema.index({ date: 1, status: 1 });
ShiftAssignmentSchema.index({ shiftId: 1, date: 1 });

/* ── Shift Swap Request ── */
const ShiftSwapRequestSchema = new mongoose.Schema(
  {
    requestNumber: { type: String, unique: true, required: true },
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    targetEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    requesterAssignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ShiftAssignment',
      required: true,
    },
    targetAssignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ShiftAssignment',
      required: true,
    },
    swapDate: { type: Date, required: true },
    reason: String,
    status: {
      type: String,
      enum: ['مقدم', 'موافقة الموظف', 'موافقة المدير', 'معتمد', 'مرفوض', 'ملغي'],
      default: 'مقدم',
    },
    targetEmployeeApproval: { type: Boolean, default: false },
    managerApproval: { type: Boolean, default: false },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  },
  { timestamps: true }
);

ShiftSwapRequestSchema.index({ requesterId: 1, status: 1 });
ShiftSwapRequestSchema.index({ requestNumber: 1 }, { unique: true });

const ShiftDefinition =
  mongoose.models.ShiftDefinition || mongoose.model('ShiftDefinition', ShiftDefinitionSchema);
const ShiftAssignment =
  mongoose.models.ShiftAssignment || mongoose.model('ShiftAssignment', ShiftAssignmentSchema);
const ShiftSwapRequest =
  mongoose.models.ShiftSwapRequest || mongoose.model('ShiftSwapRequest', ShiftSwapRequestSchema);

module.exports = { ShiftDefinition, ShiftAssignment, ShiftSwapRequest };
