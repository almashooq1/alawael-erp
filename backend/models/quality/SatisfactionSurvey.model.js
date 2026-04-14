'use strict';

const mongoose = require('mongoose');

const satisfactionSurveySchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    respondentType: { type: String, enum: ['Beneficiary', 'Guardian'], required: true },
    respondentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    surveyType: {
      type: String,
      enum: ['general', 'service', 'discharge', 'annual'],
      default: 'general',
    },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
    npsScore: { type: Number, required: true, min: 0, max: 10 },
    ratings: { type: [mongoose.Schema.Types.Mixed], default: [] },
    positiveFeedback: { type: String, default: null },
    improvementSuggestions: { type: String, default: null },
    wouldRecommend: { type: Boolean, default: null },
    channel: {
      type: String,
      enum: ['app', 'sms_link', 'tablet', 'paper'],
      default: 'app',
    },
  },
  { timestamps: true }
);

satisfactionSurveySchema.index({ branchId: 1, createdAt: -1 });
satisfactionSurveySchema.index({ npsScore: 1 });

const SatisfactionSurvey =
  mongoose.models.SatisfactionSurvey ||
  mongoose.model('SatisfactionSurvey', satisfactionSurveySchema);

module.exports = SatisfactionSurvey;
