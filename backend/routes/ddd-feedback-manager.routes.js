'use strict';
/**
 * FeedbackManager Routes
 * Auto-extracted from services/dddFeedbackManager.js
 * 13 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddFeedbackManager');
const { validate } = require('../middleware/validate');
const v = require('../validations/feedback-manager.validation');

  router.get('/feedback-manager/feedbacks', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listFeedbacks(req.query) });
    } catch (e) {
      safeError(res, e, 'feedback-manager');
    }
  });

  router.get('/feedback-manager/feedbacks/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getFeedback(req.params.id) });
    } catch (e) {
      safeError(res, e, 'feedback-manager');
    }
  });

  router.post('/feedback-manager/feedbacks', authenticate, validate(v.createFeedback), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.submitFeedback(req.body) });
    } catch (e) {
      safeError(res, e, 'feedback-manager');
    }
  });

  router.put('/feedback-manager/feedbacks/:id', authenticate, validate(v.updateFeedback), async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateFeedback(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'feedback-manager');
    }
  });

  router.post('/feedback-manager/feedbacks/:id/respond', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.respondToFeedback(req.params.id, req.body.response, req.body.responderId) });
    } catch (e) {
      safeError(res, e, 'feedback-manager');
    }
  });

  router.get('/feedback-manager/surveys', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listSurveys(req.query) });
    } catch (e) {
      safeError(res, e, 'feedback-manager');
    }
  });

  router.get('/feedback-manager/surveys/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getSurvey(req.params.id) });
    } catch (e) {
      safeError(res, e, 'feedback-manager');
    }
  });

  router.post('/feedback-manager/surveys', authenticate, validate(v.createSurvey), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createSurvey(req.body) });
    } catch (e) {
      safeError(res, e, 'feedback-manager');
    }
  });

  router.put('/feedback-manager/surveys/:id', authenticate, validate(v.updateSurvey), async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateSurvey(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'feedback-manager');
    }
  });

  router.get('/feedback-manager/responses', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listResponses(req.query) });
    } catch (e) {
      safeError(res, e, 'feedback-manager');
    }
  });

  router.post('/feedback-manager/responses', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.submitResponse(req.body) });
    } catch (e) {
      safeError(res, e, 'feedback-manager');
    }
  });

  router.get('/feedback-manager/analytics', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getFeedbackAnalytics(req.query) });
    } catch (e) {
      safeError(res, e, 'feedback-manager');
    }
  });

  router.get('/feedback-manager/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'feedback-manager');
    }
  });

module.exports = router;
