const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    type: {
      type: String, // Annual, Sick, Unpaid, etc.
      required: true,
      enum: ['annual', 'sick', 'emergency', 'unpaid', 'maternity', 'paternity'],
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    reason: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // approval / rejection audit trail — attendanceService writes these on
    // approve/reject; they were undeclared so strict mode silently dropped them
    // (only status + approvedBy persisted → no record of when/why/who-rejected).
    approvedDate: { type: Date },
    approvalNotes: { type: String, trim: true },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectedDate: { type: Date },
    rejectionReason: { type: String, trim: true },
    attachments: [String],
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common query patterns
leaveSchema.index({ employeeId: 1, status: 1 });
leaveSchema.index({ startDate: 1, endDate: 1 });
leaveSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.models.Leave || mongoose.model('Leave', leaveSchema);
