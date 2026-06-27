/**
 * AI Predictive Analytics Routes — مسارات التحليلات التنبؤية
 * Mount: /api/v1/ai-predictive
 *
 * Endpoints:
 *   GET /goal-prediction/:goalId
 *   GET /discharge-readiness/:beneficiaryId
 *   GET /risk-flags/:beneficiaryId
 *   GET /intervention-recommendations/:beneficiaryId
 *   GET /length-of-stay/:beneficiaryId
 *   GET /full-analysis/:beneficiaryId
 */

'use strict';

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const service = require('../services/aiPredictiveAnalytics.service');
const safeError = require('../utils/safeError');
const logger = require('../utils/logger');

const CLINICAL_ROLES = ['therapist', 'doctor', 'admin', 'clinical_director'];

/** Helper: run service call with standardized response */
async function handle(req, res, fn, name) {
  try {
    const result = await fn();
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error(`[AI-Predictive] ${name} error:`, err.message);
    safeError(res, err, `ai-predictive:${name}`);
  }
}

// ─── 1. Goal Achievement Prediction ─────────────────────────────────────
router.get(
  '/goal-prediction/:goalId',
  requireAuth,
  requireRole(CLINICAL_ROLES),
  async (req, res) => {
    const { goalId } = req.params;
    const weeksAhead = Number(req.query.weeksAhead) || 4;
    await handle(req, res, () => service.predictGoalAchievement(goalId, weeksAhead), 'goal-prediction');
  }
);

// ─── 2. Discharge Readiness ────────────────────────────────────────────
router.get(
  '/discharge-readiness/:beneficiaryId',
  requireAuth,
  requireRole(CLINICAL_ROLES),
  async (req, res) => {
    const { beneficiaryId } = req.params;
    await handle(req, res, () => service.predictDischargeReadiness(beneficiaryId), 'discharge-readiness');
  }
);

// ─── 3. Risk Flags ────────────────────────────────────────────────────
router.get(
  '/risk-flags/:beneficiaryId',
  requireAuth,
  requireRole(CLINICAL_ROLES),
  async (req, res) => {
    const { beneficiaryId } = req.params;
    await handle(req, res, () => service.predictRiskFlags(beneficiaryId), 'risk-flags');
  }
);

// ─── 4. Intervention Recommendations ────────────────────────────────────
router.get(
  '/intervention-recommendations/:beneficiaryId',
  requireAuth,
  requireRole(CLINICAL_ROLES),
  async (req, res) => {
    const { beneficiaryId } = req.params;
    await handle(req, res, () => service.recommendNextInterventions(beneficiaryId), 'intervention-recommendations');
  }
);

// ─── 5. Length of Stay Estimate ─────────────────────────────────────────
router.get(
  '/length-of-stay/:beneficiaryId',
  requireAuth,
  requireRole(CLINICAL_ROLES),
  async (req, res) => {
    const { beneficiaryId } = req.params;
    await handle(req, res, () => service.predictLengthOfStay(beneficiaryId), 'length-of-stay');
  }
);

// ─── 6. Full Analysis (all predictions in one call) ────────────────────
router.get(
  '/full-analysis/:beneficiaryId',
  requireAuth,
  requireRole(CLINICAL_ROLES),
  async (req, res) => {
    const { beneficiaryId } = req.params;
    await handle(req, res, () => service.fullAnalysis(beneficiaryId), 'full-analysis');
  }
);

module.exports = router;
