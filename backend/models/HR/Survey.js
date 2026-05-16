'use strict';

const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema(
  {
    _id: false,
    key: { type: String, required: true, maxlength: 50 },
    text: { type: String, required: true, maxlength: 500 },
    kind: { type: String, enum: ['rating', 'nps', 'text', 'choice', 'boolean'], default: 'rating' },
    required: { type: Boolean, default: true },
    options: { type: [String], default: [] },
  },
  { _id: false }
);

const ResponseSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null }, // null = anonymous
    submittedAt: { type: Date, default: Date.now },
    answers: { type: mongoose.Schema.Types.Mixed, default: {} }, // { questionKey: value }
  },
  { _id: false }
);

const SurveySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, maxlength: 2000 },
    kind: {
      type: String,
      enum: [
        'pulse',
        'nps',
        'engagement',
        'exit_interview',
        'onboarding_feedback',
        'training_feedback',
      ],
      required: true,
      index: true,
    },
    status: { type: String, enum: ['draft', 'active', 'closed'], default: 'draft', index: true },
    anonymous: { type: Boolean, default: false },
    audience: {
      departments: { type: [String], default: [] }, // empty = all
      branches: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    },
    questions: { type: [QuestionSchema], default: [] },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    responses: { type: [ResponseSchema], default: [] },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'hr_surveys' }
);

SurveySchema.virtual('responseCount').get(function () {
  return (this.responses || []).length;
});
SurveySchema.set('toJSON', { virtuals: true });
SurveySchema.set('toObject', { virtuals: true });

module.exports = mongoose.models.Survey || mongoose.model('Survey', SurveySchema);
