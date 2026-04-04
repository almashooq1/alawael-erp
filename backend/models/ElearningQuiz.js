/**
 * ElearningQuiz Model — نموذج الاختبارات الإلكترونية
 * البرومبت 33: نظام التعلم الإلكتروني والتدريب
 */
const mongoose = require('mongoose');

const elearningQuizSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'ElearningCourse', required: true },
    moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseModule' },
    title: { type: String, required: true, maxlength: 255 },
    titleAr: { type: String, required: true, maxlength: 255 },
    quizType: {
      type: String,
      enum: ['assessment', 'practice', 'final'],
      default: 'assessment',
    },
    timeLimitMinutes: { type: Number },
    passingScore: { type: Number, default: 70, min: 0, max: 100 },
    maxAttempts: { type: Number, default: 3, min: 1 },
    randomizeQuestions: { type: Boolean, default: true },
    randomizeOptions: { type: Boolean, default: true },
    showResultsImmediately: { type: Boolean, default: true },
    showCorrectAnswers: { type: Boolean, default: false },
    questionsPerAttempt: { type: Number }, // عدد أسئلة كل محاولة
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

elearningQuizSchema.index({ courseId: 1 });

elearningQuizSchema.pre('save', function (next) {
  if (!this.uuid) this.uuid = require('crypto').randomUUID();
  next();
});

module.exports = mongoose.model('ElearningQuiz', elearningQuizSchema);
