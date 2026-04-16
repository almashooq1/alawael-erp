'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const surveyResponseSchema = new Schema(
  {
    response_id: {
      type: String,
      unique: true,
      default: () => `RESP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    },
    survey_id: { type: Schema.Types.ObjectId, ref: 'SatisfactionSurvey', required: true },
    beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
    program_id: { type: Schema.Types.ObjectId, ref: 'DisabilityRehabilitation' },

    respondent_type: {
      type: String,
      enum: ['beneficiary', 'guardian', 'family_member'],
    },
    respondent_name: String,

    // الإجابات
    responses: [
      {
        question_id: String,
        question_text: String,
        response_type: String,
        response_value: Schema.Types.Mixed,
        score: Number,
      },
    ],

    // النتائج
    results: {
      total_score: Number,
      max_possible_score: Number,
      percentage_score: Number,
      category_scores: [
        {
          category: String,
          score: Number,
          percentage: Number,
        },
      ],
    },

    // التعليقات المفتوحة
    comments: {
      positive_feedback: String,
      areas_for_improvement: String,
      suggestions: String,
      additional_comments: String,
    },

    // الشكاوى
    complaints: [
      {
        complaint_type: String,
        complaint_details: String,
        severity: { type: String, enum: ['minor', 'moderate', 'serious'] },
        action_required: { type: Boolean, default: false },
        resolution: String,
        resolved: { type: Boolean, default: false },
        resolution_date: Date,
      },
    ],

    response_date: { type: Date, default: Date.now },
    is_anonymous: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const SurveyResponse =
  mongoose.models.SurveyResponse || mongoose.model('SurveyResponse', surveyResponseSchema);

module.exports = SurveyResponse;
