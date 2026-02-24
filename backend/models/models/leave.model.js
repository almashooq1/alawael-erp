/**
 * Leave Model - نموذج الإجازات
 */

const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  type: {
    type: String,
    enum: ['annual', 'sick', 'personal', 'emergency', 'unpaid', 'maternity'],
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  days: {
    type: Number,
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  attachment: {
    type: String, // رابط المستند (شهادة طبية مثلاً)
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
  },
  requestDate: {
    type: Date,
    default: Date.now,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedDate: Date,
  approvalNotes: String,
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  rejectedDate: Date,
  rejectionReason: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// الفهارس
leaveSchema.index({ employeeId: 1, status: 1 });
leaveSchema.index({ status: 1, startDate: 1 });
leaveSchema.index({ requestDate: -1 });

module.exports = mongoose.model('Leave', leaveSchema);
