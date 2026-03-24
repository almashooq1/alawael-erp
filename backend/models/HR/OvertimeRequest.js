/**
 * Overtime Model — نموذج إدارة العمل الإضافي
 *
 * Tracks overtime requests, approvals, and calculations per Saudi Labor Law.
 * Article 107: overtime = hourly wage × 1.5
 */
const mongoose = require('mongoose');

const OvertimeRequestSchema = new mongoose.Schema(
  {
    requestNumber: {
      type: String,
      unique: true,
      required: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    type: {
      type: String,
      enum: ['عمل إضافي عادي', 'عمل يوم راحة', 'عمل يوم عطلة رسمية', 'عمل ليلي'],
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    totalHours: {
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
      enum: ['مقدم', 'موافقة المدير', 'موافقة الموارد البشرية', 'معتمد', 'مرفوض', 'ملغي'],
      default: 'مقدم',
    },
    calculation: {
      hourlyRate: Number,
      multiplier: {
        type: Number,
        default: 1.5, // Saudi Labor Law Article 107
      },
      overtimeRate: Number,
      totalAmount: Number,
    },
    approvalWorkflow: [
      {
        step: String,
        approver: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        status: { type: String, enum: ['معلق', 'موافق', 'مرفوض'] },
        date: Date,
        notes: String,
      },
    ],
    isPreApproved: { type: Boolean, default: false },
    department: String,
    project: String,
    payrollMonth: String,
    includedInPayroll: { type: Boolean, default: false },
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

OvertimeRequestSchema.index({ employeeId: 1, date: -1 });
// requestNumber: removed — unique:true creates implicit index
OvertimeRequestSchema.index({ status: 1, date: -1 });
OvertimeRequestSchema.index({ department: 1, date: -1 });

OvertimeRequestSchema.pre('save', async function (next) {
  if (!this.requestNumber) {
    const count = await mongoose.model('OvertimeRequest').countDocuments();
    this.requestNumber = `OT-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  // Auto-calculate multiplier based on type
  if (this.type === 'عمل يوم راحة') {
    this.calculation.multiplier = 2.0;
  } else if (this.type === 'عمل يوم عطلة رسمية') {
    this.calculation.multiplier = 2.5;
  } else if (this.type === 'عمل ليلي') {
    this.calculation.multiplier = 1.75;
  }
  next();
});

module.exports =
  mongoose.models.OvertimeRequest || mongoose.model('OvertimeRequest', OvertimeRequestSchema);
