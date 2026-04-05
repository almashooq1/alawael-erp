/**
 * LearningPath Model — نموذج مسارات التعلم
 * البرومبت 33: نظام التعلم الإلكتروني والتدريب
 */
const mongoose = require('mongoose');

const learningPathSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true },
    code: { type: String, required: true, unique: true, maxlength: 50 },
    title: { type: String, required: true, maxlength: 255 },
    titleAr: { type: String, required: true, maxlength: 255 },
    description: { type: String },
    targetRole: { type: String, maxlength: 100 },
    estimatedDurationHours: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isMandatory: { type: Boolean, default: false },
    badgeIcon: { type: String },
    completionBadgeName: { type: String },
    courseSequence: { type: mongoose.Schema.Types.Mixed }, // [{course_id, order, is_required}]
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

learningPathSchema.index({ branchId: 1, targetRole: 1, isActive: 1 });

learningPathSchema.pre('save', function (next) {
  if (!this.uuid) this.uuid = require('crypto').randomUUID();
  next();
});

module.exports = mongoose.models.LearningPath || mongoose.model('LearningPath', learningPathSchema);
