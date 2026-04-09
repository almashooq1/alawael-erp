/**
 * ██████████████████████████████████████████████████████████████
 * ██  DDD Feedback Manager — Phase 27                        ██
 * ██  Manage patient feedback, surveys & ratings              ██
 * ██████████████████████████████████████████████████████████████
 */

const mongoose = require('mongoose');
const express = require('express');

/* ─── Constants ─── */
const FEEDBACK_TYPES = [
  'service_rating',
  'therapist_rating',
  'facility_rating',
  'program_evaluation',
  'session_feedback',
  'discharge_feedback',
  'complaint',
  'suggestion',
  'compliment',
  'accessibility_feedback',
  'communication_feedback',
  'general',
];

const FEEDBACK_STATUSES = [
  'submitted',
  'under_review',
  'acknowledged',
  'in_progress',
  'resolved',
  'closed',
  'escalated',
  'archived',
  'rejected',
  'pending',
];

const SURVEY_TYPES = [
  'satisfaction',
  'nps',
  'csat',
  'ces',
  'clinical_outcome',
  'experience',
  'accessibility',
  'communication',
  'discharge',
  'follow_up',
  'annual',
  'custom',
];

const SURVEY_STATUSES = [
  'draft',
  'active',
  'paused',
  'completed',
  'archived',
  'scheduled',
  'expired',
  'cancelled',
  'in_review',
  'published',
];

const QUESTION_TYPES = [
  'likert_scale',
  'multiple_choice',
  'open_text',
  'yes_no',
  'rating_stars',
  'nps_scale',
  'ranking',
  'matrix',
  'slider',
  'date_picker',
  'file_upload',
  'dropdown',
];

const RATING_CATEGORIES = [
  'overall',
  'therapist',
  'facility',
  'communication',
  'timeliness',
  'cleanliness',
  'professionalism',
  'empathy',
  'outcome',
  'accessibility',
];

const BUILTIN_SURVEY_TEMPLATES = [
  'post_session_quick',
  'discharge_comprehensive',
  'nps_quarterly',
  'accessibility_audit',
  'therapist_evaluation',
  'facility_review',
  'program_effectiveness',
  'family_satisfaction',
  'tele_rehab_experience',
  'annual_comprehensive',
];

/* ─── Schemas ─── */
const feedbackSchema = new mongoose.Schema(
  {
    feedbackId: { type: String, required: true, unique: true },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
    episodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Episode' },
    type: { type: String, enum: FEEDBACK_TYPES, required: true },
    status: { type: String, enum: FEEDBACK_STATUSES, default: 'submitted' },
    subject: { type: String, required: true },
    description: { type: String },
    rating: { type: Number, min: 1, max: 5 },
    category: { type: String, enum: RATING_CATEGORIES },
    anonymous: { type: Boolean, default: false },
    tags: [String],
    attachments: [{ name: String, url: String, type: String }],
    response: { type: String },
    respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    respondedAt: { type: Date },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

feedbackSchema.index({ beneficiaryId: 1, createdAt: -1 });
feedbackSchema.index({ type: 1, status: 1 });
feedbackSchema.index({ feedbackId: 1 }, { unique: true });

const surveySchema = new mongoose.Schema(
  {
    surveyId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String },
    type: { type: String, enum: SURVEY_TYPES, required: true },
    status: { type: String, enum: SURVEY_STATUSES, default: 'draft' },
    questions: [
      {
        questionId: String,
        text: String,
        type: { type: String, enum: QUESTION_TYPES },
        required: { type: Boolean, default: true },
        options: [String],
        order: Number,
      },
    ],
    targetAudience: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

surveySchema.index({ surveyId: 1 }, { unique: true });
surveySchema.index({ type: 1, status: 1 });

const surveyResponseSchema = new mongoose.Schema(
  {
    responseId: { type: String, required: true, unique: true },
    surveyId: { type: mongoose.Schema.Types.ObjectId, ref: 'DDDSurvey' },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
    answers: [
      {
        questionId: String,
        value: mongoose.Schema.Types.Mixed,
        comment: String,
      },
    ],
    completedAt: { type: Date },
    timeTaken: { type: Number }, // seconds
    anonymous: { type: Boolean, default: false },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

surveyResponseSchema.index({ responseId: 1 }, { unique: true });
surveyResponseSchema.index({ surveyId: 1, beneficiaryId: 1 });

const feedbackAnalyticsSchema = new mongoose.Schema(
  {
    analyticsId: { type: String, required: true, unique: true },
    period: { type: String, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    totalFeedbacks: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    ratingDistribution: {
      one: { type: Number, default: 0 },
      two: { type: Number, default: 0 },
      three: { type: Number, default: 0 },
      four: { type: Number, default: 0 },
      five: { type: Number, default: 0 },
    },
    feedbackByType: { type: Map, of: Number },
    sentimentBreakdown: {
      positive: { type: Number, default: 0 },
      neutral: { type: Number, default: 0 },
      negative: { type: Number, default: 0 },
    },
    topIssues: [{ issue: String, count: Number }],
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

feedbackAnalyticsSchema.index({ analyticsId: 1 }, { unique: true });
feedbackAnalyticsSchema.index({ periodStart: 1, periodEnd: 1 });

/* ─── Models ─── */
const DDDFeedback = mongoose.models.DDDFeedback || mongoose.model('DDDFeedback', feedbackSchema);
const DDDSurvey = mongoose.models.DDDSurvey || mongoose.model('DDDSurvey', surveySchema);
const DDDSurveyResponse =
  mongoose.models.DDDSurveyResponse || mongoose.model('DDDSurveyResponse', surveyResponseSchema);
const DDDFeedbackAnalytics =
  mongoose.models.DDDFeedbackAnalytics ||
  mongoose.model('DDDFeedbackAnalytics', feedbackAnalyticsSchema);

/* ─── Domain Module ─── */
class FeedbackManager {
  constructor() {
    this.name = 'FeedbackManager';
  }

  /* Feedback CRUD */
  async listFeedbacks(filter = {}) {
    return DDDFeedback.find(filter).sort({ createdAt: -1 }).lean();
  }
  async getFeedback(id) {
    return DDDFeedback.findById(id).lean();
  }
  async submitFeedback(data) {
    data.feedbackId = data.feedbackId || `FB-${Date.now()}`;
    return DDDFeedback.create(data);
  }
  async updateFeedback(id, data) {
    return DDDFeedback.findByIdAndUpdate(id, data, { new: true }).lean();
  }
  async respondToFeedback(id, response, responderId) {
    return DDDFeedback.findByIdAndUpdate(
      id,
      {
        response,
        respondedBy: responderId,
        respondedAt: new Date(),
        status: 'acknowledged',
      },
      { new: true }
    ).lean();
  }

  /* Survey CRUD */
  async listSurveys(filter = {}) {
    return DDDSurvey.find(filter).sort({ createdAt: -1 }).lean();
  }
  async getSurvey(id) {
    return DDDSurvey.findById(id).lean();
  }
  async createSurvey(data) {
    data.surveyId = data.surveyId || `SRV-${Date.now()}`;
    return DDDSurvey.create(data);
  }
  async updateSurvey(id, data) {
    return DDDSurvey.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  /* Survey Responses */
  async listResponses(filter = {}) {
    return DDDSurveyResponse.find(filter).sort({ createdAt: -1 }).lean();
  }
  async submitResponse(data) {
    data.responseId = data.responseId || `SRVR-${Date.now()}`;
    data.completedAt = data.completedAt || new Date();
    return DDDSurveyResponse.create(data);
  }

  /* Analytics */
  async getFeedbackAnalytics(filter = {}) {
    return DDDFeedbackAnalytics.find(filter).sort({ periodStart: -1 }).lean();
  }
  async generateAnalytics(periodData) {
    periodData.analyticsId = periodData.analyticsId || `FBAN-${Date.now()}`;
    return DDDFeedbackAnalytics.create(periodData);
  }

  /* Health */
  async healthCheck() {
    const [fb, sv, sr, fa] = await Promise.all([
      DDDFeedback.countDocuments(),
      DDDSurvey.countDocuments(),
      DDDSurveyResponse.countDocuments(),
      DDDFeedbackAnalytics.countDocuments(),
    ]);
    return {
      status: 'ok',
      counts: { feedbacks: fb, surveys: sv, surveyResponses: sr, feedbackAnalytics: fa },
    };
  }
}

/* ─── Router Factory ─── */
function createFeedbackManagerRouter() {
  const r = express.Router();
  const svc = new FeedbackManager();

  /* Feedbacks */
  r.get('/feedback-manager/feedbacks', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listFeedbacks(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.get('/feedback-manager/feedbacks/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getFeedback(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.post('/feedback-manager/feedbacks', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.submitFeedback(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.put('/feedback-manager/feedbacks/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateFeedback(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.post('/feedback-manager/feedbacks/:id/respond', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.respondToFeedback(req.params.id, req.body.response, req.body.responderId),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Surveys */
  r.get('/feedback-manager/surveys', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listSurveys(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.get('/feedback-manager/surveys/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getSurvey(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.post('/feedback-manager/surveys', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createSurvey(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.put('/feedback-manager/surveys/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateSurvey(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Survey Responses */
  r.get('/feedback-manager/responses', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listResponses(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.post('/feedback-manager/responses', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.submitResponse(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Analytics */
  r.get('/feedback-manager/analytics', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getFeedbackAnalytics(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Health */
  r.get('/feedback-manager/health', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return r;
}

/* ─── Exports ─── */
module.exports = {
  FeedbackManager,
  DDDFeedback,
  DDDSurvey,
  DDDSurveyResponse,
  DDDFeedbackAnalytics,
  FEEDBACK_TYPES,
  FEEDBACK_STATUSES,
  SURVEY_TYPES,
  SURVEY_STATUSES,
  QUESTION_TYPES,
  RATING_CATEGORIES,
  BUILTIN_SURVEY_TEMPLATES,
  createFeedbackManagerRouter,
};
