/**
 * Leave Model (HR)
 * Modular, extensible leave record for HR system
 */
const mongoose = require('mongoose');

const LeaveSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  leaveType: {
    type: String,
    enum: [
      'إجازة سنوية',
      'إجازة مرضية',
      'إجازة بدون راتب',
      'إجازة أمومة',
      'إجازة أبوة',
      'إجازة استثنائية',
    ],
    required: true,
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  duration: { type: Number, required: true },
  reason: String,
  status: {
    type: String,
    enum: ['مرسل', 'قيد المراجعة', 'موافق عليه', 'مرفوض'],
    default: 'مرسل',
  },
  approvedBy: mongoose.Schema.Types.ObjectId,
  approvalDate: Date,
  rejectionReason: String,
  isPaidLeave: { type: Boolean, default: true },
  leaveBalance: {
    used: Number,
    remaining: Number,
  },
  documents: [String],
  attachments: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

LeaveSchema.index({ employeeId: 1, startDate: -1 });
LeaveSchema.index({ status: 1, startDate: -1 });

module.exports = mongoose.model('Leave', LeaveSchema);
