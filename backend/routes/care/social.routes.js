'use strict';

/**
 * care/social.routes.js — Phase 17 Commit 2 (4.0.84).
 *
 * HTTP surface for the social-services subsystem. Mounted at
 * /api/care/social and /api/v1/care/social.
 *
 * Endpoints:
 *   GET  /reference                          — registry snapshot
 *
 *   Cases:
 *     GET  /cases                            — list (filters)
 *     GET  /cases/:id                        — detail
 *     POST /cases                            — open (activates intake SLA)
 *     POST /cases/:id/flag-high-risk
 *     POST /cases/:id/downgrade-risk
 *     POST /cases/:id/assessment             — record assessment + transition
 *     POST /cases/:id/intervention-plan      — create plan + transition to active
 *     POST /cases/:id/intervention-items     — append intervention item
 *     PATCH /cases/:id/intervention-items/:itemId/status
 *     POST /cases/:id/referrals              — external org referral
 *     POST /cases/:id/transition             — generic state-machine move
 *     POST /cases/:id/transfer               — reassign to another worker
 *     POST /cases/:id/close                  — close with outcome
 *     POST /cases/:id/cancel
 *
 *   Workers:
 *     GET  /workers/:userId/caseload         — open cases for a worker
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');

const { authenticate, authorize } = require('../../middleware/auth');
const safeError = require('../../utils/safeError');
const registry = require('../../config/care/social.registry');

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
  if (err.code === 'ILLEGAL_TRANSITION') {
    return res.status(409).json({
      success: false,
      error: err.message,
      from: err.from,
      to: err.to,
    });
  }
  if (err.code === 'MISSING_FIELD') {
    return res.status(422).json({ success: false, error: err.message, fields: err.fields });
  }
  if (err.code === 'CONFLICT') return res.status(409).json({ success: false, error: err.message });
  return safeError(res, err);
}

function getService() {
  return require('../../startup/careBootstrap')._getSocialCaseService?.() || _fallback();
}

let _fb = null;
function _fallback() {
  if (_fb) return _fb;
  const { createSocialCaseService } = require('../../services/care/socialCase.service');
  _fb = createSocialCaseService({
    caseModel: require('../../models/care/SocialCase.model'),
  });
  return _fb;
}

// ── reference ──────────────────────────────────────────────────────

router.get(
  '/reference',
  authenticate,
  wrap((req, res) => {
    res.json({
      success: true,
      data: {
        caseTypes: registry.CASE_TYPES,
        caseStatuses: registry.CASE_STATUSES,
        terminalStatuses: registry.CASE_TERMINAL_STATUSES,
        pauseStatuses: registry.CASE_PAUSE_STATUSES,
        transitions: registry.CASE_TRANSITIONS,
        riskLevels: registry.RISK_LEVELS,
        assessmentDomains: registry.ASSESSMENT_DOMAINS,
        domainScoreRange: [registry.DOMAIN_SCORE_MIN, registry.DOMAIN_SCORE_MAX],
        interventionTypes: registry.INTERVENTION_TYPES,
        closureOutcomes: registry.CLOSURE_OUTCOMES,
      },
    });
  })
);

// ── Cases ──────────────────────────────────────────────────────────

router.get(
  '/cases',
  authenticate,
  [
    query('branchId').optional().isMongoId(),
    query('status').optional().isIn(registry.CASE_STATUSES),
    query('assignedWorkerId').optional().isMongoId(),
    query('riskLevel').optional().isIn(registry.RISK_LEVELS),
    query('beneficiaryId').optional().isMongoId(),
    query('caseType').optional().isIn(registry.CASE_TYPES),
    query('limit').optional().isInt({ min: 1, max: 500 }),
    query('skip').optional().isInt({ min: 0 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const rows = await getService().list({
        branchId: req.query.branchId,
        status: req.query.status,
        assignedWorkerId: req.query.assignedWorkerId,
        riskLevel: req.query.riskLevel,
        beneficiaryId: req.query.beneficiaryId,
        caseType: req.query.caseType,
        limit: req.query.limit ? Number(req.query.limit) : 100,
        skip: req.query.skip ? Number(req.query.skip) : 0,
      });
      res.json({ success: true, data: rows });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.get(
  '/cases/:id',
  authenticate,
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().findById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, error: 'Case not found' });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/cases',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor', 'social_manager']),
  [
    body('beneficiaryId').isMongoId(),
    body('assignedWorkerId').isMongoId(),
    body('caseType').optional().isIn(registry.CASE_TYPES),
    body('riskLevel').optional().isIn(registry.RISK_LEVELS),
    body('branchId').optional().isMongoId(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().openCase(req.body, { actorId: req.user?._id });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/cases/:id/flag-high-risk',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor', 'social_manager']),
  [
    param('id').isMongoId(),
    body('riskLevel').optional().isIn(['high', 'critical']),
    body('reason').optional().isString(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().flagHighRisk(req.params.id, {
        riskLevel: req.body.riskLevel || 'high',
        reason: req.body.reason,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/cases/:id/downgrade-risk',
  authenticate,
  authorize(['admin', 'social_supervisor', 'social_manager']),
  [param('id').isMongoId(), body('riskLevel').optional().isIn(['low', 'medium'])],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().downgradeRisk(req.params.id, {
        riskLevel: req.body.riskLevel || 'low',
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/cases/:id/assessment',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor']),
  [
    param('id').isMongoId(),
    body('assessmentSummary').isString().notEmpty(),
    body('domainScores').optional().isArray(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().recordAssessment(req.params.id, req.body, {
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/cases/:id/intervention-plan',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor']),
  [
    param('id').isMongoId(),
    body('items').isArray({ min: 1 }),
    body('items.*.type').isIn(registry.INTERVENTION_TYPES),
    body('items.*.title').isString().notEmpty(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().createInterventionPlan(req.params.id, req.body, {
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/cases/:id/intervention-items',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor']),
  [
    param('id').isMongoId(),
    body('type').isIn(registry.INTERVENTION_TYPES),
    body('title').isString().notEmpty(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().addInterventionItem(req.params.id, req.body, {
        actorId: req.user?._id,
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.patch(
  '/cases/:id/intervention-items/:itemId/status',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor']),
  [
    param('id').isMongoId(),
    param('itemId').isMongoId(),
    body('toStatus').isIn(['planned', 'in_progress', 'completed', 'skipped', 'cancelled']),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().updateInterventionItemStatus(
        req.params.id,
        req.params.itemId,
        {
          toStatus: req.body.toStatus,
          outcome: req.body.outcome,
          actorId: req.user?._id,
        }
      );
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/cases/:id/referrals',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor']),
  [param('id').isMongoId(), body('targetOrg').isString().notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().addReferral(req.params.id, req.body, {
        actorId: req.user?._id,
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/cases/:id/transition',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor', 'social_manager']),
  [
    param('id').isMongoId(),
    body('toStatus').isIn(registry.CASE_STATUSES),
    body('notes').optional().isString(),
    body('patch').optional().isObject(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().transitionCase(req.params.id, req.body.toStatus, {
        actorId: req.user?._id,
        notes: req.body.notes,
        patch: req.body.patch || {},
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/cases/:id/transfer',
  authenticate,
  authorize(['admin', 'social_supervisor', 'social_manager']),
  [param('id').isMongoId(), body('toWorkerId').isMongoId(), body('reason').isString().notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().transferCase(req.params.id, {
        toWorkerId: req.body.toWorkerId,
        toWorkerNameSnapshot: req.body.toWorkerNameSnapshot,
        reason: req.body.reason,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/cases/:id/close',
  authenticate,
  authorize(['admin', 'social_supervisor', 'social_manager']),
  [
    param('id').isMongoId(),
    body('closureOutcome').isIn(registry.CLOSURE_OUTCOMES),
    body('closureSummary').isString().notEmpty(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().closeCase(req.params.id, {
        closureOutcome: req.body.closureOutcome,
        closureSummary: req.body.closureSummary,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/cases/:id/cancel',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor', 'social_manager']),
  [param('id').isMongoId(), body('reason').isString().notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().cancelCase(req.params.id, {
        reason: req.body.reason,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

// ── Worker caseload ────────────────────────────────────────────────

router.get(
  '/workers/:userId/caseload',
  authenticate,
  [param('userId').isMongoId(), query('includeTerminal').optional().isBoolean()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const rows = await getService().workerCaseload(req.params.userId, {
        includeTerminal: req.query.includeTerminal === 'true',
      });
      res.json({ success: true, data: rows });
    } catch (err) {
      mapError(err, res);
    }
  })
);

module.exports = router;
