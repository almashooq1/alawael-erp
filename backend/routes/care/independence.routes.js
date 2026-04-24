'use strict';

/**
 * care/independence.routes.js — Phase 17 Commit 6 (4.0.88).
 *
 * Mounted at /api/care/independence (and /api/v1/care/independence).
 *
 *   /transition-assessments  → transition readiness
 *   /iadl                    → Lawton IADL administration
 *   /participation           → community participation log
 *   /reference               → vocab
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');

const { authenticate, authorize } = require('../../middleware/auth');
const safeError = require('../../utils/safeError');
const registry = require('../../config/care/independence.registry');

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
      status: err.status,
    });
  }
  if (err.code === 'MISSING_FIELD') {
    return res.status(422).json({ success: false, error: err.message, fields: err.fields });
  }
  return safeError(res, err);
}

function getService() {
  return require('../../startup/careBootstrap')._getIndependenceService?.() || _fallback();
}

let _fb = null;
function _fallback() {
  if (_fb) return _fb;
  const { createIndependenceService } = require('../../services/care/independence.service');
  _fb = createIndependenceService({
    transitionModel: require('../../models/care/TransitionReadinessAssessment.model'),
    iadlModel: require('../../models/care/IadlAssessment.model'),
    participationModel: require('../../models/care/CommunityParticipationLog.model'),
    partnerModel: require('../../models/care/CommunityPartner.model'),
  });
  return _fb;
}

const staffRoles = [
  'admin',
  'social_worker',
  'social_supervisor',
  'social_manager',
  'psychologist',
  'care_manager',
  'occupational_therapist',
];

// ── reference ──────────────────────────────────────────────────────

router.get(
  '/reference',
  authenticate,
  wrap((req, res) => {
    res.json({
      success: true,
      data: {
        transitionTargets: registry.TRANSITION_TARGETS,
        transitionDomains: registry.TRANSITION_DOMAINS,
        transitionStatuses: registry.TRANSITION_STATUSES,
        transitionTransitions: registry.TRANSITION_TRANSITIONS,
        readinessTiers: registry.READINESS_TIERS,
        domainScoreLabels: registry.DOMAIN_SCORE_LABELS,
        iadlDomains: registry.IADL_DOMAINS,
        iadlBands: registry.IADL_BANDS,
        iadlTotalMax: registry.IADL_TOTAL_MAX,
        participationTypes: registry.PARTICIPATION_TYPES,
        supportLevels: registry.SUPPORT_LEVELS,
        participationOutcomes: registry.PARTICIPATION_OUTCOMES,
      },
    });
  })
);

// ══════════════════════════════════════════════════════════════════
// TRANSITION READINESS
// ══════════════════════════════════════════════════════════════════

router.get(
  '/transition-assessments',
  authenticate,
  [
    query('beneficiaryId').optional().isMongoId(),
    query('branchId').optional().isMongoId(),
    query('status').optional().isIn(registry.TRANSITION_STATUSES),
    query('targetTransition').optional().isIn(registry.TRANSITION_TARGETS),
    query('limit').optional().isInt({ min: 1, max: 500 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const rows = await getService().listTransitionAssessments({
        beneficiaryId: req.query.beneficiaryId,
        branchId: req.query.branchId,
        status: req.query.status,
        targetTransition: req.query.targetTransition,
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
  '/transition-assessments/:id',
  authenticate,
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().findTransitionAssessmentById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, error: 'Assessment not found' });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/transition-assessments',
  authenticate,
  authorize(staffRoles),
  [body('beneficiaryId').isMongoId(), body('targetTransition').isIn(registry.TRANSITION_TARGETS)],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().createTransitionAssessment(req.body, {
        actorId: req.user?._id,
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/transition-assessments/:id/score',
  authenticate,
  authorize(staffRoles),
  [
    param('id').isMongoId(),
    body('domain').isIn(registry.TRANSITION_DOMAIN_CODES),
    body('score').isInt({ min: 0, max: 3 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().scoreTransitionDomain(req.params.id, {
        domain: req.body.domain,
        score: Number(req.body.score),
        notes: req.body.notes,
        evidence: req.body.evidence,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/transition-assessments/:id/complete',
  authenticate,
  authorize(staffRoles),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().completeTransitionAssessment(req.params.id, {
        overallReadiness: req.body.overallReadiness,
        summary: req.body.summary,
        recommendations: req.body.recommendations,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/transition-assessments/:id/supersede',
  authenticate,
  authorize(staffRoles),
  [param('id').isMongoId(), body('newAssessmentId').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().supersedeTransitionAssessment(req.params.id, {
        newAssessmentId: req.body.newAssessmentId,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/transition-assessments/:id/cancel',
  authenticate,
  authorize(staffRoles),
  [param('id').isMongoId(), body('cancellationReason').isString().notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().cancelTransitionAssessment(req.params.id, {
        cancellationReason: req.body.cancellationReason,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/transition-assessments/:id/goals',
  authenticate,
  authorize(staffRoles),
  [param('id').isMongoId(), body('goal').isString().notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().addGoal(req.params.id, req.body, {
        actorId: req.user?._id,
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.patch(
  '/transition-assessments/:id/goals/:goalId',
  authenticate,
  authorize(staffRoles),
  [param('id').isMongoId(), param('goalId').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().updateGoal(req.params.id, req.params.goalId, {
        status: req.body.status,
        notes: req.body.notes,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/transition-assessments/:id/barriers',
  authenticate,
  authorize(staffRoles),
  [param('id').isMongoId(), body('barrier').isString().notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().addBarrier(req.params.id, req.body, {
        actorId: req.user?._id,
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.get(
  '/beneficiary/:beneficiaryId/transition-active',
  authenticate,
  [param('beneficiaryId').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().beneficiaryActiveTransition(req.params.beneficiaryId);
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

// ══════════════════════════════════════════════════════════════════
// IADL
// ══════════════════════════════════════════════════════════════════

router.post(
  '/iadl',
  authenticate,
  authorize(staffRoles),
  [body('beneficiaryId').isMongoId(), body('domainScores').isArray({ min: 1 })],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().administerIadl(req.body, { actorId: req.user?._id });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.get(
  '/iadl',
  authenticate,
  [
    query('beneficiaryId').optional().isMongoId(),
    query('branchId').optional().isMongoId(),
    query('band').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 500 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const rows = await getService().listIadl({
        beneficiaryId: req.query.beneficiaryId,
        branchId: req.query.branchId,
        band: req.query.band,
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
  '/iadl/:id',
  authenticate,
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().findIadlById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, error: 'IADL not found' });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.get(
  '/beneficiary/:beneficiaryId/iadl-trend',
  authenticate,
  [param('beneficiaryId').isMongoId(), query('limit').optional().isInt({ min: 1, max: 50 })],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const trend = await getService().beneficiaryIadlTrend(req.params.beneficiaryId, {
        limit: req.query.limit ? Number(req.query.limit) : 10,
      });
      res.json({ success: true, data: trend });
    } catch (err) {
      mapError(err, res);
    }
  })
);

// ══════════════════════════════════════════════════════════════════
// PARTICIPATION
// ══════════════════════════════════════════════════════════════════

router.post(
  '/participation',
  authenticate,
  authorize(staffRoles),
  [
    body('beneficiaryId').isMongoId(),
    body('activityType').isIn(registry.PARTICIPATION_TYPES),
    body('occurredAt').isISO8601(),
    body('partnerId').optional().isMongoId(),
    body('supportLevel').optional().isIn(registry.SUPPORT_LEVELS),
    body('outcome').optional().isIn(registry.PARTICIPATION_OUTCOMES),
    body('beneficiarySatisfaction').optional().isInt({ min: 1, max: 5 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().logParticipation(req.body, { actorId: req.user?._id });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.get(
  '/participation',
  authenticate,
  [
    query('beneficiaryId').optional().isMongoId(),
    query('branchId').optional().isMongoId(),
    query('activityType').optional().isIn(registry.PARTICIPATION_TYPES),
    query('partnerId').optional().isMongoId(),
    query('outcome').optional().isIn(registry.PARTICIPATION_OUTCOMES),
    query('limit').optional().isInt({ min: 1, max: 500 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const rows = await getService().listParticipation({
        beneficiaryId: req.query.beneficiaryId,
        branchId: req.query.branchId,
        activityType: req.query.activityType,
        partnerId: req.query.partnerId,
        outcome: req.query.outcome,
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
  '/participation/:id',
  authenticate,
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().findParticipationById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, error: 'Log not found' });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.patch(
  '/participation/:id',
  authenticate,
  authorize(staffRoles),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().updateParticipation(req.params.id, req.body, {
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.get(
  '/beneficiary/:beneficiaryId/participation-analytics',
  authenticate,
  [param('beneficiaryId').isMongoId(), query('windowDays').optional().isInt({ min: 1, max: 365 })],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const data = await getService().beneficiaryParticipationAnalytics(req.params.beneficiaryId, {
        windowDays: req.query.windowDays ? Number(req.query.windowDays) : 90,
      });
      res.json({ success: true, data });
    } catch (err) {
      mapError(err, res);
    }
  })
);

module.exports = router;
