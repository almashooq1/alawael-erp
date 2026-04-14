'use strict';
/**
 * Leave Model
 * نموذج الإجازات
 * Split from attendanceModel.js (Phase 3 refactor)
 */

const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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

  // الموافقات
  status: {
    type: String,
    enum: ['مرسل', 'قيد المراجعة', 'موافق عليه', 'مرفوض'],
    default: 'مرسل',
  },
  approvedBy: mongoose.Schema.Types.ObjectId,
  approvalDate: Date,
  rejectionReason: String,

  // المستندات
  documents: [String],
  attachments: [String],

  // الراتب
  isPaidLeave: { type: Boolean, default: true },
  leaveBalance: {
    used: Number,
    remaining: Number,
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

leaveSchema.index({ employeeId: 1, startDate: -1 });
leaveSchema.index({ status: 1, startDate: -1 });

const Leave = mongoose.models.Leave || mongoose.model('Leave', leaveSchema);

module.exports = Leave;
