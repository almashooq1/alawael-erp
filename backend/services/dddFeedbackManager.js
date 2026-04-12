'use strict';
/**
 * ██████████████████████████████████████████████████████████████
 * ██  DDD Feedback Manager — Phase 27                        ██
 * ██  Manage patient feedback, surveys & ratings              ██
 * ██████████████████████████████████████████████████████████████
 */

const { DDDFeedback, DDDSurvey, DDDSurveyResponse, DDDFeedbackAnalytics, FEEDBACK_TYPES, FEEDBACK_STATUSES, SURVEY_TYPES, SURVEY_STATUSES, QUESTION_TYPES, RATING_CATEGORIES, BUILTIN_SURVEY_TEMPLATES } = require('../models/DddFeedbackManager');

const BaseCrudService = require('./base/BaseCrudService');

class FeedbackManager extends BaseCrudService {
  constructor() {
    super('FeedbackManager');
  }

  /* Feedback CRUD */
  async listFeedbacks(filter = {}) { return this._list(DDDFeedback, filter); }
  async getFeedback(id) { return this._getById(DDDFeedback, id); }
  async submitFeedback(data) {
    data.feedbackId = data.feedbackId || `FB-${Date.now()}`;
    return DDDFeedback.create(data);
  }
  async updateFeedback(id, data) { return this._update(DDDFeedback, id, data); }
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
  async listSurveys(filter = {}) { return this._list(DDDSurvey, filter); }
  async getSurvey(id) { return this._getById(DDDSurvey, id); }
  async createSurvey(data) {
    data.surveyId = data.surveyId || `SRV-${Date.now()}`;
    return DDDSurvey.create(data);
  }
  async updateSurvey(id, data) { return this._update(DDDSurvey, id, data); }

  /* Survey Responses */
  async listResponses(filter = {}) { return this._list(DDDSurveyResponse, filter); }
  async submitResponse(data) {
    data.responseId = data.responseId || `SRVR-${Date.now()}`;
    data.completedAt = data.completedAt || new Date();
    return DDDSurveyResponse.create(data);
  }

  /* Analytics */
  async getFeedbackAnalytics(filter = {}) { return this._list(DDDFeedbackAnalytics, filter, { sort: { periodStart: -1 } }); }
  async generateAnalytics(periodData) {
    periodData.analyticsId = periodData.analyticsId || `FBAN-${Date.now()}`;
    return DDDFeedbackAnalytics.create(periodData);
  }

}

module.exports = new FeedbackManager();
