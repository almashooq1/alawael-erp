/**
 * QuizQuestion Model — نموذج أسئلة الاختبارات
 * البرومبت 33: نظام التعلم الإلكتروني والتدريب
 */
const mongoose = require('mongoose');

const quizQuestionSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true },
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'ElearningQuiz', required: true },
    questionText: { type: String, required: true },
    questionTextAr: { type: String, required: true },
    questionType: {
      type: String,
      enum: ['single_choice', 'multiple_choice', 'true_false', 'short_answer'],
      required: true,
    },
    options: { type: mongoose.Schema.Types.Mixed }, // [{text, text_ar, is_correct}]
    correctAnswer: { type: String }, // للأسئلة النصية
    explanation: { type: String },
    explanationAr: { type: String },
    points: { type: Number, default: 1, min: 1 },
    orderIndex: { type: Number, default: 0 },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    topicTag: { type: String, maxlength: 100 },
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

quizQuestionSchema.index({ quizId: 1, orderIndex: 1 });
quizQuestionSchema.index({ difficulty: 1 });

quizQuestionSchema.pre('save', function (next) {
  if (!this.uuid) this.uuid = require('crypto').randomUUID();
  next();
});

module.exports = mongoose.models.QuizQuestion || mongoose.model('QuizQuestion', quizQuestionSchema);
