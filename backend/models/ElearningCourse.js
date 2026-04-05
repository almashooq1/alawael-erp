/**
 * ElearningCourse Model — نموذج المقررات الإلكترونية
 * البرومبت 33: نظام التعلم الإلكتروني والتدريب
 */
const mongoose = require('mongoose');

const elearningCourseSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true },
    code: { type: String, required: true, unique: true, maxlength: 50 },
    title: { type: String, required: true, maxlength: 255 },
    titleAr: { type: String, required: true, maxlength: 255 },
    description: { type: String },
    descriptionAr: { type: String },
    category: {
      type: String,
      enum: [
        'clinical',
        'safety',
        'compliance',
        'soft_skills',
        'rehabilitation',
        'caregiver',
        'onboarding',
      ],
      required: true,
    },
    format: {
      type: String,
      enum: ['scorm', 'video', 'pdf', 'interactive', 'blended', 'live'],
      required: true,
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      required: true,
    },
    language: { type: String, enum: ['ar', 'en', 'both'], default: 'ar' },
    durationMinutes: { type: Number, default: 0, min: 0 },
    passingScore: { type: Number, default: 70, min: 0, max: 100 },
    isMandatory: { type: Boolean, default: false },
    isCpdEligible: { type: Boolean, default: false },
    cpdHours: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    thumbnailPath: { type: String },
    targetRoles: { type: [String], default: [] }, // أدوار المستهدفين
    prerequisites: { type: [String], default: [] }, // كودات المقررات الشرطية
    maxAttempts: { type: Number, default: 3, min: 1 },
    certificateValidityMonths: { type: Number },
    instructorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    scormCompatible: { type: Boolean, default: false },
    scormPackagePath: { type: String },
    version: { type: Number, default: 1 },
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

elearningCourseSchema.index({ branchId: 1, category: 1, status: 1 });
elearningCourseSchema.index({ isMandatory: 1, status: 1 });
elearningCourseSchema.index({ instructorId: 1 });

elearningCourseSchema.pre('save', function (next) {
  if (!this.uuid) this.uuid = require('crypto').randomUUID();
  next();
});

module.exports =
  mongoose.models.ElearningCourse || mongoose.model('ElearningCourse', elearningCourseSchema);
