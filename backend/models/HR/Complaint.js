/**
 * Complaint Model — نموذج الشكاوى والتظلمات
 *
 * Tracks employee complaints and grievances through a lifecycle:
 *   submitted → under_review → investigating → resolved / rejected
 */
const mongoose = require('mongoose');

const ComplaintSchema = new mongoose.Schema(
  {
    complaintNumber: {
      type: String,
      unique: true,
      required: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'شكوى إدارية',
        'تظلم من قرار',
        'تحرش أو تنمر',
        'بيئة عمل',
        'تمييز',
        'مخالفة نظام',
        'راتب ومستحقات',
        'ترقية',
        'نقل',
        'أخرى',
      ],
      required: true,
    },
    priority: {
      type: String,
      enum: ['عاجل', 'مرتفع', 'متوسط', 'منخفض'],
      default: 'متوسط',
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    againstEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    againstDepartment: String,
    status: {
      type: String,
      enum: ['مقدمة', 'قيد المراجعة', 'قيد التحقيق', 'تم الحل', 'مرفوضة', 'مغلقة'],
      default: 'مقدمة',
    },
    attachments: [
      {
        filename: String,
        path: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    investigation: {
      assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
      startDate: Date,
      endDate: Date,
      findings: String,
      witnesses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
      evidence: [String],
    },
    resolution: {
      decision: String,
      actionTaken: String,
      resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
      resolvedAt: Date,
      employeeSatisfied: Boolean,
      followUpDate: Date,
    },
    timeline: [
      {
        action: String,
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        date: { type: Date, default: Date.now },
        notes: String,
      },
    ],
    isConfidential: { type: Boolean, default: false },
    isAnonymous: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ComplaintSchema.index({ employeeId: 1, status: 1 });
ComplaintSchema.index({ complaintNumber: 1 });
ComplaintSchema.index({ status: 1, priority: 1 });

ComplaintSchema.pre('save', async function (next) {
  if (!this.complaintNumber) {
    const count = await mongoose.model('Complaint').countDocuments();
    this.complaintNumber = `CMP-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.models.Complaint || mongoose.model('Complaint', ComplaintSchema);
