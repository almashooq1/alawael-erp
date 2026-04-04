/**
 * TrainerEvaluation Model — نموذج تقييمات المدربين
 * البرومبت 33: نظام التعلم الإلكتروني والتدريب
 */
const mongoose = require('mongoose');

const trainerEvaluationSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'ElearningCourse', required: true },
    enrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseEnrollment',
      required: true,
    },
    traineeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    contentRating: { type: Number, min: 1, max: 5 }, // جودة المحتوى
    deliveryRating: { type: Number, min: 1, max: 5 }, // أسلوب التقديم
    relevanceRating: { type: Number, min: 1, max: 5 }, // الصلة بالعمل
    overallRating: { type: Number, min: 1, max: 5 }, // التقييم الكلي
    strengths: { type: String },
    improvements: { type: String },
    comments: { type: String },
    wouldRecommend: { type: Boolean, default: true },
    submittedAt: { type: Date, default: Date.now },
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

trainerEvaluationSchema.index({ enrollmentId: 1, trainerId: 1 }, { unique: true });
trainerEvaluationSchema.index({ branchId: 1, trainerId: 1, courseId: 1 });

trainerEvaluationSchema.pre('save', function (next) {
  if (!this.uuid) this.uuid = require('crypto').randomUUID();
  next();
});

module.exports = mongoose.model('TrainerEvaluation', trainerEvaluationSchema);
