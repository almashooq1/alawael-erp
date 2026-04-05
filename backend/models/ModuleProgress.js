/**
 * ModuleProgress Model — نموذج تقدم الموظف في وحدات المقرر
 * البرومبت 33: نظام التعلم الإلكتروني والتدريب
 */
const mongoose = require('mongoose');

const moduleProgressSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true },
    enrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseEnrollment',
      required: true,
    },
    moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseModule', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started',
    },
    watchPercentage: { type: Number, default: 0, min: 0, max: 100 },
    timeSpentSeconds: { type: Number, default: 0 },
    startedAt: { type: Date },
    completedAt: { type: Date },
    lastAccessedAt: { type: Date },
    scormData: { type: mongoose.Schema.Types.Mixed }, // بيانات SCORM cmi
    attempts: { type: Number, default: 0 },
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

moduleProgressSchema.index({ enrollmentId: 1, moduleId: 1 }, { unique: true });
moduleProgressSchema.index({ branchId: 1, userId: 1, status: 1 });

moduleProgressSchema.pre('save', function (next) {
  if (!this.uuid) this.uuid = require('crypto').randomUUID();
  next();
});

module.exports =
  mongoose.models.ModuleProgress || mongoose.model('ModuleProgress', moduleProgressSchema);
