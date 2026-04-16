'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const satisfactionSurveySchema = new Schema(
  {
    survey_id: {
      type: String,
      unique: true,
      default: () => `SURV-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    },
    survey_name: { type: String, required: true },
    survey_type: {
      type: String,
      enum: [
        'service_satisfaction',
        'program_evaluation',
        'feedback',
        'complaint',
        'suggestion',
        'exit_survey',
      ],
    },

    // الأسئلة
    questions: [
      {
        question_id: String,
        question_text_ar: String,
        question_text_en: String,
        question_type: {
          type: String,
          enum: [
            'rating_5',
            'rating_10',
            'yes_no',
            'multiple_choice',
            'open_ended',
            'likert_scale',
          ],
        },
        category: String,
        options: [String],
        is_required: { type: Boolean, default: true },
      },
    ],

    target_audience: {
      type: String,
      enum: ['beneficiary', 'guardian', 'family', 'all'],
      default: 'all',
    },

    is_active: { type: Boolean, default: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const SatisfactionSurvey =
  mongoose.models.SatisfactionSurvey ||
  mongoose.model('SatisfactionSurvey', satisfactionSurveySchema);

module.exports = SatisfactionSurvey;
