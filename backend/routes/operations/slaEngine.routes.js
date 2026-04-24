'use strict';

/**
 * slaEngine.routes.js — Phase 16 Commit 1 (4.0.66).
 *
 * HTTP surface for the unified ops SLA engine. Mounted by
 * `_registry.js` at `/api/ops/sla` and `/api/v1/ops/sla`.
 *
 * All endpoints authenticated. Admin/ops endpoints (tick, activate)
 * require the `ops_manager` or `admin` role.
 *
 * Endpoints:
 *
 *   GET  /reference              — registry snapshot (policies, modules, severities)
 *   GET  /status                 — live counts + at-risk list
 *   GET  /breaches               — recent breach log (filters: module, kind, sinceHours)
 *   POST /activate               — manually start a clock (admin; usually called by services)
 *   POST /observe                — record a subject state change
 *   POST /tick                   — force a sweep now (admin)
 *
 * Response shape: `{ success: true, data }` | `{ success: false, error }`.
 */

const express = require('express');
const { body, query, validationResult } = require('express-validator');

const { authenticate, authorize } = require('../../middleware/auth');
const safeError = require('../../utils/safeError');
const { getDefault: getEngine } = require('../../services/operations/slaEngine.service');
const registry = require('../../config/sla.registry');
const { BREACH_KINDS } = require('../../models/operations/SLABreach.model');

const router = express.Router();

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
}

// ── reference ──────────────────────────────────────────────────────

router.get(
  '/reference',
  authenticate,
  wrap((req, res) => {
    res.json({
      success: true,
      data: {
        modules: registry.OPS_MODULES,
        severities: registry.SEVERITIES,
        policies: registry.SLAS.map(s => ({
          id: s.id,
          module: s.module,
          event: s.event,
          label: s.label,
          labelAr: s.labelAr,
          severity: s.severity,
          responseTargetMinutes: s.responseTargetMinutes,
          resolutionTargetMinutes: s.resolutionTargetMinutes,
          warnAtPct: s.warnAtPct,
          businessHoursOnly: s.businessHoursOnly,
          pauseOnStates: s.pauseOnStates,
          escalationStepCount: (s.escalation || []).length,
        })),
      },
    });
  })
);

// ── status + dashboards ────────────────────────────────────────────

router.get(
  '/status',
  authenticate,
  [
    query('module').optional().isIn(registry.OPS_MODULES),
    query('severity').optional().isIn(registry.SEVERITIES),
    query('limit').optional().isInt({ min: 1, max: 500 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const data = await getEngine().getStatus({
        module: req.query.module,
        severity: req.query.severity,
        limit: req.query.limit ? Number(req.query.limit) : 50,
      });
      res.json({ success: true, data });
    } catch (err) {
      safeError(res, err);
    }
  })
);

router.get(
  '/breaches',
  authenticate,
  [
    query('module').optional().isIn(registry.OPS_MODULES),
    query('kind').optional().isIn(BREACH_KINDS),
    query('sinceHours').optional().isInt({ min: 1, max: 720 }),
    query('limit').optional().isInt({ min: 1, max: 500 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const rows = await getEngine().listBreaches({
        module: req.query.module,
        kind: req.query.kind,
        sinceHours: req.query.sinceHours ? Number(req.query.sinceHours) : 24,
        limit: req.query.limit ? Number(req.query.limit) : 100,
      });
      res.json({ success: true, data: rows });
    } catch (err) {
      safeError(res, err);
    }
  })
);

// ── admin / ops actions ────────────────────────────────────────────

router.post(
  '/activate',
  authenticate,
  authorize(['admin', 'ops_manager']),
  [
    body('policyId').isString().notEmpty(),
    body('subjectType').isString().notEmpty(),
    body('subjectId').isMongoId(),
    body('subjectRef').optional().isString(),
    body('branchId').optional().isMongoId(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const sla = await getEngine().activate({
        policyId: req.body.policyId,
        subjectType: req.body.subjectType,
        subjectId: req.body.subjectId,
        subjectRef: req.body.subjectRef,
        branchId: req.body.branchId,
        metadata: req.body.metadata || {},
      });
      res.status(201).json({ success: true, data: sla });
    } catch (err) {
      safeError(res, err);
    }
  })
);

router.post(
  '/observe',
  authenticate,
  authorize(['admin', 'ops_manager']),
  [
    body('slaId').isMongoId(),
    body('eventType').isIn(['state_changed', 'first_response', 'resolved', 'cancelled']),
    body('state').optional().isString(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const sla = await getEngine().observe({
        slaId: req.body.slaId,
        eventType: req.body.eventType,
        state: req.body.state,
      });
      res.json({ success: true, data: sla });
    } catch (err) {
      if (err.code === 'ILLEGAL_TRANSITION') {
        return res.status(409).json({ success: false, error: err.message });
      }
      safeError(res, err);
    }
  })
);

router.post(
  '/tick',
  authenticate,
  authorize(['admin', 'ops_manager']),
  wrap(async (req, res) => {
    try {
      const report = await getEngine().tick();
      res.json({ success: true, data: report });
    } catch (err) {
      safeError(res, err);
    }
  })
);

module.exports = router;
