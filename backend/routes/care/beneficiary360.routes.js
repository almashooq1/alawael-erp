'use strict';

/**
 * care/beneficiary360.routes.js — Phase 17 Commit 7 (4.0.89). ⭐
 *
 * Mounted at /api/care/360 (and /api/v1/care/360).
 *
 *   GET /:beneficiaryId                 → full 360 profile
 *   GET /:beneficiaryId/summary         → lightweight card
 *   GET /:beneficiaryId/timeline        → unified event feed
 *   GET /:beneficiaryId/health-score    → cross-domain wellbeing
 *   GET /:beneficiaryId/attention       → action-required list
 */

const express = require('express');
const { param, query, validationResult } = require('express-validator');

const { authenticate, authorize } = require('../../middleware/auth');
const safeError = require('../../utils/safeError');

const router = express.Router();

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
}

function mapError(err, res) {
  if (err.code === 'NOT_FOUND') return res.status(404).json({ success: false, error: err.message });
  return safeError(res, err);
}

function getService() {
  return require('../../startup/careBootstrap')._getBeneficiary360Service?.() || _fallback();
}

let _fb = null;
function _fallback() {
  if (_fb) return _fb;
  const { createBeneficiary360Service } = require('../../services/care/beneficiary360.service');
  const bootstrap = require('../../startup/careBootstrap');
  _fb = createBeneficiary360Service({
    services: {
      leadFunnel: bootstrap._getLeadFunnelService?.(),
      socialCase: bootstrap._getSocialCaseService?.(),
      homeVisit: bootstrap._getHomeVisitService?.(),
      welfare: bootstrap._getWelfareService?.(),
      community: bootstrap._getCommunityService?.(),
      psych: bootstrap._getPsychService?.(),
      independence: bootstrap._getIndependenceService?.(),
    },
  });
  return _fb;
}

const viewRoles = [
  'admin',
  'social_worker',
  'social_supervisor',
  'social_manager',
  'psychologist',
  'psychiatrist',
  'care_manager',
  'occupational_therapist',
  'nurse',
];

router.get(
  '/:beneficiaryId',
  authenticate,
  authorize(viewRoles),
  [
    param('beneficiaryId').isMongoId(),
    query('windowDays').optional().isInt({ min: 1, max: 365 }),
    query('include').optional().isString(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const include = req.query.include
        ? String(req.query.include)
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
        : null;
      const data = await getService().getProfile(req.params.beneficiaryId, {
        windowDays: req.query.windowDays ? Number(req.query.windowDays) : 90,
        include,
      });
      res.json({ success: true, data });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.get(
  '/:beneficiaryId/summary',
  authenticate,
  authorize(viewRoles),
  [param('beneficiaryId').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const data = await getService().getSummary(req.params.beneficiaryId);
      res.json({ success: true, data });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.get(
  '/:beneficiaryId/timeline',
  authenticate,
  authorize(viewRoles),
  [
    param('beneficiaryId').isMongoId(),
    query('since').optional().isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 500 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const data = await getService().getTimeline(req.params.beneficiaryId, {
        since: req.query.since,
        limit: req.query.limit ? Number(req.query.limit) : 50,
      });
      res.json({ success: true, data });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.get(
  '/:beneficiaryId/health-score',
  authenticate,
  authorize(viewRoles),
  [param('beneficiaryId').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const data = await getService().getHealthScore(req.params.beneficiaryId);
      res.json({ success: true, data });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.get(
  '/:beneficiaryId/attention',
  authenticate,
  authorize(viewRoles),
  [param('beneficiaryId').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const data = await getService().getAttention(req.params.beneficiaryId);
      res.json({ success: true, data });
    } catch (err) {
      mapError(err, res);
    }
  })
);

module.exports = router;
