'use strict';
/**
 * PredictiveEngine Routes
 * Auto-extracted from services/dddPredictiveEngine.js
 * 9 endpoints — Auth required on all
 */

const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const { getPredictiveEngineDashboard, runPrediction, detectAnomalies, getPredictionHistory, provideFeedback, seedModels } = require('../services/dddPredictiveEngine');
const { DDDPredictionModel, DDDAnomaly } = require('../models/DddPredictiveEngine');

  router.get('/predictive-engine', authenticate, async (_req, res) => {
    try {
    res.json({ success: true, data: await getPredictiveEngineDashboard() });
    } catch (e) {
      safeError(res, e, 'predictive-engine');
    }
  });

  router.get('/predictive-engine/models', authenticate, async (_req, res) => {
    try {
    const models = await DDDPredictionModel.find({ isActive: true }).lean();
    res.json({ success: true, data: models, builtin: BUILTIN_MODELS });
    } catch (e) {
      safeError(res, e, 'predictive-engine');
    }
  });

  router.post('/predictive-engine/predict', authenticate, async (req, res) => {
    try {
    const { modelId, entityType, entityId, input } = req.body;
    const result = await runPrediction(modelId, entityType, entityId, input);
    res.json({ success: true, data: result });
    } catch (e) {
      safeError(res, e, 'predictive-engine');
    }
  });

  router.post('/predictive-engine/forecast', authenticate, async (req, res) => {
    try {
    const { values, periods } = req.body;
    res.json({ success: true, data: generateForecast(values, periods) });
    } catch (e) {
      safeError(res, e, 'predictive-engine');
    }
  });

  router.post('/predictive-engine/anomalies/detect', authenticate, async (req, res) => {
    try {
    const { domain, metricKey, values } = req.body;
    const anomalies = await detectAnomalies(domain, metricKey, values);
    res.json({ success: true, data: anomalies });
    } catch (e) {
      safeError(res, e, 'predictive-engine');
    }
  });

  router.get('/predictive-engine/anomalies', authenticate, async (req, res) => {
    try {
    const query = {};
    if (req.query.domain) query.domain = req.query.domain;
    if (req.query.severity) query.severity = req.query.severity;
    if (req.query.status) query.status = req.query.status;
    const anomalies = await DDDAnomaly.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(req.query.limit) || 50)
    .lean();
    res.json({ success: true, data: anomalies });
    } catch (e) {
      safeError(res, e, 'predictive-engine');
    }
  });

  router.get('/predictive-engine/history/:entityType/:entityId', authenticate, async (req, res) => {
    try {
    const data = await getPredictionHistory(
    req.params.entityType,
    req.params.entityId,
    req.query
    );
    res.json({ success: true, data });
    } catch (e) {
      safeError(res, e, 'predictive-engine');
    }
  });

  router.post('/predictive-engine/feedback', authenticate, async (req, res) => {
    try {
    const { predictionId, actual, correct } = req.body;
    const result = await provideFeedback(predictionId, actual, correct);
    res.json({ success: true, data: result });
    } catch (e) {
      safeError(res, e, 'predictive-engine');
    }
  });

  router.post('/predictive-engine/seed', authenticate, async (_req, res) => {
    try {
    res.json({ success: true, data: await seedModels() });
    } catch (e) {
      safeError(res, e, 'predictive-engine');
    }
  });

module.exports = router;
