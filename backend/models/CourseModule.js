/**
 * CourseModule Model — نموذج وحدات المقرر
 * البرومبت 33: نظام التعلم الإلكتروني والتدريب
 */
const mongoose = require('mongoose');

const courseModuleSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'ElearningCourse', required: true },
    title: { type: String, required: true, maxlength: 255 },
    titleAr: { type: String, required: true, maxlength: 255 },
    description: { type: String },
    orderIndex: { type: Number, default: 0 },
    contentType: {
      type: String,
      enum: ['video', 'pdf', 'quiz', 'scorm', 'interactive', 'text'],
      required: true,
    },
    contentPath: { type: String },
    contentUrl: { type: String },
    durationMinutes: { type: Number, default: 0 },
    isRequired: { type: Boolean, default: true },
    isFreePreview: { type: Boolean, default: false },
    videoTrackingConfig: { type: mongoose.Schema.Types.Mixed },
    minWatchPercentage: { type: Number, default: 80, min: 0, max: 100 },
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

courseModuleSchema.index({ courseId: 1, orderIndex: 1 });

courseModuleSchema.pre('save', function (next) {
  if (!this.uuid) this.uuid = require('crypto').randomUUID();
  next();
});

module.exports = mongoose.model('CourseModule', courseModuleSchema);
