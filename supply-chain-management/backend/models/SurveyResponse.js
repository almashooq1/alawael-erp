const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: String,
  value: mongoose.Schema.Types.Mixed,
  selectedOptions: [String],
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const surveyResponseSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => `RESP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    },
    surveyId: {
      type: String,
      required: true
    },
    customerId: {
      type: String,
      required: true,
    },
    answers: [answerSchema],
    deviceType: {
      type: String,
      enum: ['mobile', 'tablet', 'desktop'],
      default: 'desktop',
    },
    completionTime: Number,
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      default: 'neutral',
    },
    npsScore: {
      type: Number,
      min: 0,
      max: 10,
    },
    csatScore: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SurveyResponse', surveyResponseSchema);
