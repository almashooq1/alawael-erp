const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  options: [
    {
      text: { type: String, required: true },
      isCorrect: { type: Boolean, default: false },
    },
  ],
  points: { type: Number, default: 1 },
});

const quizSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    lessonId: {
      // Optional: attach quiz to specific lesson
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
    },
    title: {
      type: String,
      required: true,
    },
    description: String,
    questions: [questionSchema],
    passingScore: {
      type: Number,
      default: 70, // Percentage
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Quiz', quizSchema);
