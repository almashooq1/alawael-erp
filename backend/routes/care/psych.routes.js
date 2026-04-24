'use strict';

/**
 * care/psych.routes.js — Phase 17 Commit 5 (4.0.87).
 *
 * Mounted at /api/care/psych (and /api/v1/care/psych).
 *
 *   /flags          → risk flag CRUD + lifecycle
 *   /scales         → PHQ-9 / GAD-7 / DASS-21 administration
 *   /mdt            → multi-disciplinary team meetings
 *   /reference      → vocab + scale definitions
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');

const { authenticate, authorize } = require('../../middleware/auth');
const safeError = require('../../utils/safeError');
const registry = require('../../config/care/psych.registry');

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
  if (err.code === 'CONFLICT') return res.status(409).json({ success: false, error: err.message });
  return safeError(res, err);
}

function getService() {
  return require('../../startup/careBootstrap')._getPsychService?.() || _fallback();
}

let _fb = null;
function _fallback() {
  if (_fb) return _fb;
  const { createPsychService } = require('../../services/care/psych.service');
  _fb = createPsychService({
    flagModel: require('../../models/care/PsychRiskFlag.model'),
    scaleModel: require('../../models/care/PsychScaleAssessment.model'),
    mdtModel: require('../../models/care/MdtMeeting.model'),
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
        flagTypes: registry.FLAG_TYPES,
        flagSeverities: registry.FLAG_SEVERITIES,
        flagStatuses: registry.FLAG_STATUSES,
        flagTransitions: registry.FLAG_TRANSITIONS,
        mdtPurposes: registry.MDT_PURPOSES,
        mdtRoles: registry.MDT_ROLES,
        mdtStatuses: registry.MDT_STATUSES,
        scales: registry.SCALES,
        scaleCodes: registry.SCALE_CODES,
      },
    });
  })
);

// ══════════════════════════════════════════════════════════════════
// RISK FLAGS
// ══════════════════════════════════════════════════════════════════

router.get(
  '/flags',
  authenticate,
  [
    query('beneficiaryId').optional().isMongoId(),
    query('branchId').optional().isMongoId(),
    query('caseId').optional().isMongoId(),
    query('status').optional().isIn(registry.FLAG_STATUSES),
    query('severity').optional().isIn(registry.FLAG_SEVERITIES),
    query('flagType').optional().isIn(registry.FLAG_TYPES),
    query('limit').optional().isInt({ min: 1, max: 500 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const rows = await getService().listFlags({
        beneficiaryId: req.query.beneficiaryId,
        branchId: req.query.branchId,
        caseId: req.query.caseId,
        status: req.query.status,
        severity: req.query.severity,
        flagType: req.query.flagType,
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
  '/flags/:id',
  authenticate,
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().findFlagById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, error: 'Risk flag not found' });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/flags',
  authenticate,
  authorize(['admin', 'psychologist', 'psychiatrist', 'social_worker', 'care_manager']),
  [
    body('beneficiaryId').isMongoId(),
    body('flagType').isIn(registry.FLAG_TYPES),
    body('severity').isIn(registry.FLAG_SEVERITIES),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().raiseFlag(req.body, { actorId: req.user?._id });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/flags/:id/safety-plan',
  authenticate,
  authorize(['admin', 'psychologist', 'psychiatrist', 'care_manager']),
  [param('id').isMongoId(), body('safetyPlan').isString().notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().establishSafetyPlan(req.params.id, {
        safetyPlan: req.body.safetyPlan,
        reviewDue: req.body.reviewDue,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/flags/:id/escalate',
  authenticate,
  authorize(['admin', 'psychologist', 'psychiatrist', 'care_manager']),
  [param('id').isMongoId(), body('escalationReason').isString().notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().escalateFlag(req.params.id, {
        escalationReason: req.body.escalationReason,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/flags/:id/resolve',
  authenticate,
  authorize(['admin', 'psychologist', 'psychiatrist', 'care_manager']),
  [param('id').isMongoId(), body('resolutionNotes').isString().notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().resolveFlag(req.params.id, {
        resolutionNotes: req.body.resolutionNotes,
        resolutionOutcome: req.body.resolutionOutcome,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/flags/:id/archive',
  authenticate,
  authorize(['admin', 'psychologist', 'psychiatrist', 'care_manager']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().archiveFlag(req.params.id, { actorId: req.user?._id });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/flags/:id/reopen',
  authenticate,
  authorize(['admin', 'psychologist', 'psychiatrist', 'care_manager']),
  [param('id').isMongoId(), body('reopenReason').isString().notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().reopenFlag(req.params.id, {
        reopenReason: req.body.reopenReason,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/flags/:id/cancel',
  authenticate,
  authorize(['admin', 'psychologist', 'psychiatrist', 'care_manager']),
  [param('id').isMongoId(), body('cancellationReason').isString().notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().cancelFlag(req.params.id, {
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
  '/flags/:id/actions',
  authenticate,
  authorize(['admin', 'psychologist', 'psychiatrist', 'care_manager', 'social_worker']),
  [param('id').isMongoId(), body('kind').isString().notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().recordFlagAction(req.params.id, {
        kind: req.body.kind,
        notes: req.body.notes,
        actorId: req.user?._id,
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.get(
  '/beneficiary/:beneficiaryId/flags/open',
  authenticate,
  [param('beneficiaryId').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const rows = await getService().beneficiaryOpenFlags(req.params.beneficiaryId);
      res.json({ success: true, data: rows });
    } catch (err) {
      mapError(err, res);
    }
  })
);

// ══════════════════════════════════════════════════════════════════
// SCALES
// ══════════════════════════════════════════════════════════════════

router.post(
  '/scales',
  authenticate,
  authorize(['admin', 'psychologist', 'psychiatrist', 'care_manager']),
  [
    body('beneficiaryId').isMongoId(),
    body('scaleCode').isIn(registry.SCALE_CODES),
    body('responses').isArray({ min: 1 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().administerScale(req.body, { actorId: req.user?._id });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.get(
  '/scales',
  authenticate,
  [
    query('beneficiaryId').optional().isMongoId(),
    query('branchId').optional().isMongoId(),
    query('scaleCode').optional().isIn(registry.SCALE_CODES),
    query('autoFlagTriggered').optional().isBoolean().toBoolean(),
    query('limit').optional().isInt({ min: 1, max: 500 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const rows = await getService().listAssessments({
        beneficiaryId: req.query.beneficiaryId,
        branchId: req.query.branchId,
        scaleCode: req.query.scaleCode,
        autoFlagTriggered:
          req.query.autoFlagTriggered === true
            ? true
            : req.query.autoFlagTriggered === false
              ? false
              : null,
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
  '/scales/:id',
  authenticate,
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().findAssessmentById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, error: 'Assessment not found' });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.get(
  '/beneficiary/:beneficiaryId/scale-trend/:scaleCode',
  authenticate,
  [
    param('beneficiaryId').isMongoId(),
    param('scaleCode').isIn(registry.SCALE_CODES),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const trend = await getService().beneficiaryScaleTrend(
        req.params.beneficiaryId,
        req.params.scaleCode,
        { limit: req.query.limit ? Number(req.query.limit) : 10 }
      );
      res.json({ success: true, data: trend });
    } catch (err) {
      mapError(err, res);
    }
  })
);

// ══════════════════════════════════════════════════════════════════
// MDT
// ══════════════════════════════════════════════════════════════════

router.post(
  '/mdt',
  authenticate,
  authorize(['admin', 'psychologist', 'psychiatrist', 'care_manager', 'social_supervisor']),
  [
    body('beneficiaryId').isMongoId(),
    body('purpose').isIn(registry.MDT_PURPOSES),
    body('scheduledFor').isISO8601(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().scheduleMdt(req.body, { actorId: req.user?._id });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.get(
  '/mdt',
  authenticate,
  [
    query('beneficiaryId').optional().isMongoId(),
    query('branchId').optional().isMongoId(),
    query('status').optional().isIn(registry.MDT_STATUSES),
    query('purpose').optional().isIn(registry.MDT_PURPOSES),
    query('limit').optional().isInt({ min: 1, max: 500 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const rows = await getService().listMdt({
        beneficiaryId: req.query.beneficiaryId,
        branchId: req.query.branchId,
        status: req.query.status,
        purpose: req.query.purpose,
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
  '/mdt/:id',
  authenticate,
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().findMdtById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, error: 'MDT not found' });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/mdt/:id/start',
  authenticate,
  authorize(['admin', 'psychologist', 'psychiatrist', 'care_manager']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().startMdt(req.params.id, { actorId: req.user?._id });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/mdt/:id/complete',
  authenticate,
  authorize(['admin', 'psychologist', 'psychiatrist', 'care_manager']),
  [param('id').isMongoId(), body('summary').isString().notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().completeMdt(req.params.id, {
        summary: req.body.summary,
        decisions: req.body.decisions || [],
        actionItems: req.body.actionItems || [],
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/mdt/:id/cancel',
  authenticate,
  authorize(['admin', 'psychologist', 'psychiatrist', 'care_manager']),
  [param('id').isMongoId(), body('cancellationReason').isString().notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().cancelMdt(req.params.id, {
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
  '/mdt/:id/reschedule',
  authenticate,
  authorize(['admin', 'psychologist', 'psychiatrist', 'care_manager']),
  [param('id').isMongoId(), body('rescheduledTo').isISO8601()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().rescheduleMdt(req.params.id, {
        rescheduledTo: req.body.rescheduledTo,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/mdt/:id/attendees',
  authenticate,
  authorize(['admin', 'psychologist', 'psychiatrist', 'care_manager']),
  [
    param('id').isMongoId(),
    body('nameSnapshot').isString().notEmpty(),
    body('role').isIn(registry.MDT_ROLES),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().addMdtAttendee(req.params.id, req.body, {
        actorId: req.user?._id,
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.patch(
  '/mdt/:id/attendees/:attendeeId',
  authenticate,
  authorize(['admin', 'psychologist', 'psychiatrist', 'care_manager']),
  [param('id').isMongoId(), param('attendeeId').isMongoId(), body('attended').isBoolean()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().markAttendance(req.params.id, req.params.attendeeId, {
        attended: req.body.attended,
        declineReason: req.body.declineReason,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

module.exports = router;
