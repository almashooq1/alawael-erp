/**
 * TrainingCompliance Model — نموذج الامتثال التدريبي للموظفين
 * البرومبت 33: نظام التعلم الإلكتروني والتدريب
 */
const mongoose = require('mongoose');

const trainingComplianceSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'ElearningCourse', required: true },
    dueDate: { type: Date, required: true },
    completedDate: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'completed', 'overdue', 'waived'],
      default: 'pending',
    },
    reminderCount: { type: Number, default: 0 },
    lastReminderAt: { type: Date },
    waiverReason: { type: String },
    waivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    year: { type: Number, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

trainingComplianceSchema.index({ userId: 1, courseId: 1, year: 1 }, { unique: true });
trainingComplianceSchema.index({ branchId: 1, status: 1, dueDate: 1 });
trainingComplianceSchema.index({ userId: 1 });

trainingComplianceSchema.pre('save', function (next) {
  if (!this.uuid) this.uuid = require('crypto').randomUUID();
  next();
});

module.exports = mongoose.model('TrainingCompliance', trainingComplianceSchema);
