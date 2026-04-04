/**
 * QuizAttempt Model — نموذج محاولات الاختبارات
 * البرومبت 33: نظام التعلم الإلكتروني والتدريب
 */
const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true },
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'ElearningQuiz', required: true },
    enrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseEnrollment',
      required: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    attemptNumber: { type: Number, default: 1, min: 1 },
    startedAt: { type: Date, required: true, default: Date.now },
    submittedAt: { type: Date },
    timeSpentSeconds: { type: Number },
    score: { type: Number, min: 0, max: 100 },
    correctAnswers: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    answers: { type: mongoose.Schema.Types.Mixed }, // [{question_id, answer, is_correct, points}]
    status: {
      type: String,
      enum: ['in_progress', 'submitted', 'graded'],
      default: 'in_progress',
    },
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

quizAttemptSchema.index({ branchId: 1, userId: 1, quizId: 1 });
quizAttemptSchema.index({ enrollmentId: 1, attemptNumber: 1 });

quizAttemptSchema.pre('save', function (next) {
  if (!this.uuid) this.uuid = require('crypto').randomUUID();
  next();
});

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
