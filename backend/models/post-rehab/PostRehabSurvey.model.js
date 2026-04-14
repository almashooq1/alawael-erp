'use strict';

const mongoose = require('mongoose');

// ── Survey Question Response ──
const surveyResponseSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    question: { type: String, required: true },
    questionAr: { type: String },
    questionType: {
      type: String,
      enum: ['RATING', 'YES_NO', 'MULTIPLE_CHOICE', 'TEXT', 'SCALE_1_10', 'LIKERT'],
      required: true,
    },
    answer: { type: mongoose.Schema.Types.Mixed },
    score: { type: Number },
  },
  { _id: false }
);

// ═══════════════════════════════════════════════════════════════════════════════
// POST-REHAB SURVEY — استبيان ما بعد التأهيل
// ═══════════════════════════════════════════════════════════════════════════════

const postRehabSurveySchema = new mongoose.Schema(
  {
    postRehabCase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PostRehabCase',
      required: true,
    },
    beneficiary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
    },

    // ── Survey Info ──
    surveyType: {
      type: String,
      enum: [
        'SATISFACTION',
        'OUTCOME',
        'QUALITY_OF_LIFE',
        'FAMILY_FEEDBACK',
        'COMPREHENSIVE',
        'CUSTOM',
      ],
      required: true,
    },
    surveyTypeAr: { type: String },
    title: { type: String, required: true },
    titleAr: { type: String },
    description: { type: String },
    descriptionAr: { type: String },
    milestone: {
      type: String,
      enum: ['3_MONTHS', '6_MONTHS', '1_YEAR', '2_YEARS', 'AD_HOC'],
    },

    // ── Status ──
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED', 'CANCELLED'],
      default: 'PENDING',
    },
    sentDate: { type: Date },
    completedDate: { type: Date },
    expiryDate: { type: Date },
    deliveryMethod: {
      type: String,
      enum: ['EMAIL', 'SMS', 'WHATSAPP', 'IN_PERSON', 'PORTAL', 'PHONE'],
    },

    // ── Respondent ──
    respondentType: {
      type: String,
      enum: ['BENEFICIARY', 'PARENT', 'GUARDIAN', 'CAREGIVER', 'TEACHER', 'EMPLOYER'],
      default: 'BENEFICIARY',
    },
    respondentName: { type: String },
    respondentRelation: { type: String },

    // ── Responses ──
    responses: [surveyResponseSchema],
    totalScore: { type: Number },
    maxScore: { type: Number },
    scorePercentage: { type: Number, min: 0, max: 100 },
    satisfactionLevel: {
      type: String,
      enum: ['VERY_SATISFIED', 'SATISFIED', 'NEUTRAL', 'DISSATISFIED', 'VERY_DISSATISFIED'],
    },

    // ── Analysis ──
    keyFindings: [String],
    keyFindingsAr: [String],
    areasOfImprovement: [String],
    areasOfImprovementAr: [String],

    // ── Metadata ──
    administeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    notesAr: { type: String },
  },
  { timestamps: true }
);

postRehabSurveySchema.index({ postRehabCase: 1, surveyType: 1 });
postRehabSurveySchema.index({ status: 1, sentDate: 1 });
postRehabSurveySchema.index({ beneficiary: 1, milestone: 1 });

const PostRehabSurvey =
  mongoose.models.PostRehabSurvey || mongoose.model('PostRehabSurvey', postRehabSurveySchema);

module.exports = PostRehabSurvey;
