const mongoose = require('mongoose');

const policyAcknowledgementSchema = new mongoose.Schema(
  {
    acknowledgementId: {
      type: String,
      unique: true,
      required: true,
      index: true
    },
    policyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Policy',
      required: true,
      index: true
    },
    policyName: String,
    employeeId: {
      type: String,
      required: true,
      index: true
    },
    employeeName: String,
    department: String,
    email: String,

    // حالة الاعترافات
    status: {
      type: String,
      enum: ['PENDING', 'ACKNOWLEDGED', 'REJECTED', 'EXPIRED'],
      default: 'PENDING'
    },

    // التواريخ
    sentDate: {
      type: Date,
      default: Date.now
    },
    dueDate: Date,
    acknowledgedDate: Date,
    viewedDate: Date,

    // تفاصيل الاعترافات
    acknowledgedBy: String,
    ipAddress: String,
    deviceInfo: String,
    signature: String,

    // في حالة الرفض
    rejectionReason: String,
    rejectionDate: Date,

    // المتابعة
    remindersSent: {
      type: Number,
      default: 0
    },
    lastReminderDate: Date,
    isOverdue: {
      type: Boolean,
      default: false
    },

    // التدريب
    trainingCompleted: {
      type: Boolean,
      default: false
    },
    trainingDate: Date,
    trainingCertificate: String,
    assessmentScore: Number,
    assessmentPassed: Boolean
  },
  {
    timestamps: true,
    collection: 'policyAcknowledgements'
  }
);

policyAcknowledgementSchema.index({ policyId: 1, employeeId: 1 });
policyAcknowledgementSchema.index({ status: 1, dueDate: 1 });
policyAcknowledgementSchema.index({ employeeId: 1 });

module.exports = mongoose.model('PolicyAcknowledgement', policyAcknowledgementSchema);
