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
    attachments: [String],
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Leave', leaveSchema);
