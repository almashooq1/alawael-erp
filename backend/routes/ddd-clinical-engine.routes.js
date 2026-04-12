'use strict';
/**
 * ClinicalEngine Routes
 * Auto-extracted from services/dddClinicalEngine.js
 * 7 endpoints — Auth required on all
 */

const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const safeError = require('../utils/safeError');
const v = require('../validations/clinical-engine.validation');

const {
  evaluateBeneficiary,
  evaluateBatch,
  getLatestInsight,
  getInsightHistory,
  getClinicalDashboard,
  getCriticalCases,
} = require('../services/dddClinicalEngine');

router.post(
  '/clinical-engine/evaluate/:beneficiaryId',
  authenticate,
  validate(v.evaluateBeneficiary),
  async (req, res) => {
    try {
      const insight = await evaluateBeneficiary(req.params.beneficiaryId, {
        evaluationType: req.body.evaluationType || 'manual',
        evaluatedBy: 'user_request',
      });
      res.json({ success: true, insight });
    } catch (e) {
      safeError(res, e, 'clinical-engine');
    }
  }
);

router.post(
  '/clinical-engine/evaluate-batch',
  authenticate,
  validate(v.evaluateBatch),
  async (req, res) => {
    try {
      const result = await evaluateBatch(req.body.filter || {});
      res.json({ success: true, ...result });
    } catch (e) {
      safeError(res, e, 'clinical-engine');
    }
  }
);

router.get('/clinical-engine/insight/:beneficiaryId', authenticate, async (req, res) => {
  try {
    const insight = await getLatestInsight(req.params.beneficiaryId);
    res.json({ success: true, insight });
  } catch (e) {
    safeError(res, e, 'clinical-engine');
  }
});

router.get('/clinical-engine/insight/:beneficiaryId/history', authenticate, async (req, res) => {
  try {
    const insights = await getInsightHistory(
      req.params.beneficiaryId,
      parseInt(req.query.limit, 10) || 20
    );
    res.json({ success: true, insights });
  } catch (e) {
    safeError(res, e, 'clinical-engine');
  }
});

router.get('/clinical-engine/dashboard', authenticate, async (req, res) => {
  try {
    const dashboard = await getClinicalDashboard(req.query.branchId);
    res.json({ success: true, dashboard });
  } catch (e) {
    safeError(res, e, 'clinical-engine');
  }
});

router.get('/clinical-engine/critical-cases', authenticate, async (req, res) => {
  try {
    const cases = await getCriticalCases(req.query.branchId, parseInt(req.query.limit, 10) || 20);
    res.json({ success: true, cases });
  } catch (e) {
    safeError(res, e, 'clinical-engine');
  }
});

router.get('/clinical-engine/rules', authenticate, async (_req, res) => {
  try {
    res.json({ success: true });
  } catch (e) {
    safeError(res, e, 'clinical-engine');
  }
});

module.exports = router;
