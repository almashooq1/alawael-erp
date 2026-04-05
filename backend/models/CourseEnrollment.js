/**
 * CourseEnrollment Model — نموذج تسجيل الموظفين في المقررات
 * البرومبت 33: نظام التعلم الإلكتروني والتدريب
 */
const mongoose = require('mongoose');

const courseEnrollmentSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'ElearningCourse', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    enrollmentType: {
      type: String,
      enum: ['voluntary', 'mandatory', 'assigned'],
      default: 'voluntary',
    },
    enrolledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    enrolledAt: { type: Date, default: Date.now },
    startedAt: { type: Date },
    completedAt: { type: Date },
    dueDate: { type: Date },
    status: {
      type: String,
      enum: ['enrolled', 'in_progress', 'completed', 'failed', 'expired'],
      default: 'enrolled',
    },
    progressPercentage: { type: Number, default: 0, min: 0, max: 100 },
    attempts: { type: Number, default: 0 },
    bestScore: { type: Number },
    lastScore: { type: Number },
    completedModules: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    certificateNumber: { type: String, unique: true, sparse: true },
    certificateIssuedAt: { type: Date },
    certificateExpiresAt: { type: Date },
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

courseEnrollmentSchema.index({ courseId: 1, userId: 1 }, { unique: true });
courseEnrollmentSchema.index({ branchId: 1, userId: 1, status: 1 });
courseEnrollmentSchema.index({ status: 1, dueDate: 1 });
courseEnrollmentSchema.index({ certificateNumber: 1 });

courseEnrollmentSchema.pre('save', function (next) {
  if (!this.uuid) this.uuid = require('crypto').randomUUID();
  next();
});

module.exports =
  mongoose.models.CourseEnrollment || mongoose.model('CourseEnrollment', courseEnrollmentSchema);
