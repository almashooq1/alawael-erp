'use strict';

/**
 * measures-workflow.routes.js — Wave 226
 * ════════════════════════════════════════════════════════════════════
 * HTTP surface for the measures workflow stack (W218 → W225).
 *
 * Endpoints (all under /api/v1/measures-workflow):
 *
 *   Selection (W218):
 *     POST   /strategist/recommend          → ranked measure picks
 *
 *   Event triggers (W220):
 *     POST   /triggers/:eventCode/fire      → fire clinical event
 *     GET    /triggers/:eventCode/preview   → what would fire
 *
 *   Lifecycle (W222):
 *     GET    /tasks                         → list tasks (by phase)
 *     POST   /tasks/:taskId/acknowledge     → clinician ack
 *     POST   /tasks/:taskId/review-breach   → QA breach review
 *
 *   Readiness gates (W223):
 *     GET    /readiness/care-plan-review/:beneficiaryId
 *     GET    /readiness/discharge/:beneficiaryId
 *     GET    /required-measures/:beneficiaryId
 *
 *   Reminders (W225):
 *     GET    /reminders/beneficiary/:beneficiaryId
 *
 * All routes require authenticate + requireBranchAccess. Admin/cron
 * mutation endpoints (lifecycle tick, gap-auditor scan, reminder
 * dispatch) are intentionally NOT exposed here — they run from
 * scheduled jobs only, not as ad-hoc HTTP.
 *
 * Each route stays thin: parse → call service → respond. Service
 * errors with known reason codes return 400; everything else 500
 * via safeError.
 * ════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');
const logger = require('../utils/logger');

const strategist = require('../services/measureSelectionStrategist.service');
const triggerSvc = require('../services/reassessmentTriggerService.service');
const lifecycle = require('../services/reassessmentLifecycle.service');
const readinessGate = require('../services/measureReadinessGate.service');
const cascade = require('../services/reassessmentReminderCascade.service');
const { MeasureReassessmentTask } = require('../domains/goals/models/MeasureReassessmentTask');

// All routes authenticated + branch-scoped.
router.use(authenticate);
router.use(requireBranchAccess);

// ─── Helpers ───────────────────────────────────────────────────────────

function _toErrorResponse(err) {
  // Service-level validation errors land here with a recognisable prefix.
  const msg = err && err.message ? String(err.message) : 'unknown error';
  if (msg.match(/required|invalid|must be|cannot be|missing|not found/i)) {
    return { status: 400, body: { success: false, error: msg } };
  }
  return { status: 500, body: safeError(err) };
}

// ════════════════════════════════════════════════════════════════════════
// W218 — Selection strategist
// ════════════════════════════════════════════════════════════════════════

/**
 * POST /strategist/recommend
 * Body: { beneficiary, discipline?, clinicalQuestion?, domain?, ... }
 */
router.post('/strategist/recommend', async (req, res) => {
  try {
    const out = await strategist.recommend(req.body || {});
    res.json({ success: true, data: out });
  } catch (err) {
    const r = _toErrorResponse(err);
    res.status(r.status).json(r.body);
  }
});

// ════════════════════════════════════════════════════════════════════════
// W220 — Event triggers
// ════════════════════════════════════════════════════════════════════════

/**
 * POST /triggers/:eventCode/fire
 * Body: { beneficiaryId, payload?, bypassCooldown?, ... }
 */
router.post('/triggers/:eventCode/fire', async (req, res) => {
  try {
    const out = await triggerSvc.fire({
      type: req.params.eventCode,
      ...(req.body || {}),
      actor: req.body?.actor || { userId: req.user?._id },
    });
    res.json({ success: true, data: out });
  } catch (err) {
    const r = _toErrorResponse(err);
    res.status(r.status).json(r.body);
  }
});

/**
 * GET /triggers/:eventCode/preview
 * Returns the measures that would fire (no side effects).
 */
router.get('/triggers/:eventCode/preview', async (req, res) => {
  try {
    const measures = await triggerSvc.previewMeasuresFor(req.params.eventCode);
    res.json({ success: true, data: { eventCode: req.params.eventCode, measures } });
  } catch (err) {
    const r = _toErrorResponse(err);
    res.status(r.status).json(r.body);
  }
});

// ════════════════════════════════════════════════════════════════════════
// W222 — Lifecycle (read + clinician actions)
// ════════════════════════════════════════════════════════════════════════

/**
 * GET /tasks?phase=X&branchId=Y&statusIn=pending,acknowledged
 */
router.get('/tasks', async (req, res) => {
  try {
    const phase = req.query.phase || undefined;
    const branchId = req.query.branchId || req.branchId || undefined;
    const statusIn = req.query.statusIn
      ? String(req.query.statusIn)
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      : undefined;
    const list = await lifecycle.listByPhase({ phase, branchId, statusIn });
    res.json({ success: true, data: list });
  } catch (err) {
    const r = _toErrorResponse(err);
    res.status(r.status).json(r.body);
  }
});

/**
 * POST /tasks/:taskId/acknowledge
 */
router.post('/tasks/:taskId/acknowledge', async (req, res) => {
  try {
    const task = await lifecycle.acknowledgeTask({
      taskId: req.params.taskId,
      actor: { userId: req.user?._id },
    });
    res.json({ success: true, data: task });
  } catch (err) {
    const r = _toErrorResponse(err);
    res.status(r.status).json(r.body);
  }
});

/**
 * POST /tasks/:taskId/review-breach
 * Body: { notes? }
 */
router.post('/tasks/:taskId/review-breach', async (req, res) => {
  try {
    const task = await lifecycle.reviewBreach({
      taskId: req.params.taskId,
      actor: { userId: req.user?._id },
      notes: req.body?.notes,
    });
    res.json({ success: true, data: task });
  } catch (err) {
    const r = _toErrorResponse(err);
    res.status(r.status).json(r.body);
  }
});

// ════════════════════════════════════════════════════════════════════════
// W223 — Readiness gates
// ════════════════════════════════════════════════════════════════════════

/**
 * GET /readiness/care-plan-review/:beneficiaryId
 *
 * Optional query: ?freshnessWindowDays=N&requiredMeasureIds=id1,id2
 */
router.get('/readiness/care-plan-review/:beneficiaryId', async (req, res) => {
  try {
    const out = await readinessGate.gateCarePlanReview({
      beneficiaryId: req.params.beneficiaryId,
      freshnessWindowDays: req.query.freshnessWindowDays
        ? Number(req.query.freshnessWindowDays)
        : undefined,
      requiredMeasureIds: req.query.requiredMeasureIds
        ? String(req.query.requiredMeasureIds).split(',').filter(Boolean)
        : undefined,
    });
    res.json({ success: true, data: out });
  } catch (err) {
    const r = _toErrorResponse(err);
    res.status(r.status).json(r.body);
  }
});

/**
 * GET /readiness/discharge/:beneficiaryId
 */
router.get('/readiness/discharge/:beneficiaryId', async (req, res) => {
  try {
    const out = await readinessGate.gateDischarge({
      beneficiaryId: req.params.beneficiaryId,
      freshnessWindowDays: req.query.freshnessWindowDays
        ? Number(req.query.freshnessWindowDays)
        : undefined,
    });
    res.json({ success: true, data: out });
  } catch (err) {
    const r = _toErrorResponse(err);
    res.status(r.status).json(r.body);
  }
});

/**
 * GET /required-measures/:beneficiaryId
 */
router.get('/required-measures/:beneficiaryId', async (req, res) => {
  try {
    const list = await readinessGate.listRequiredMeasures({
      beneficiaryId: req.params.beneficiaryId,
    });
    res.json({ success: true, data: list });
  } catch (err) {
    const r = _toErrorResponse(err);
    res.status(r.status).json(r.body);
  }
});

// ════════════════════════════════════════════════════════════════════════
// W225 — Reminders (read-only — dispatch is cron-only)
// ════════════════════════════════════════════════════════════════════════

/**
 * GET /reminders/beneficiary/:beneficiaryId
 * Returns reminder notifications fired for this beneficiary.
 */
router.get('/reminders/beneficiary/:beneficiaryId', async (req, res) => {
  try {
    const list = await cascade.listForBeneficiary(req.params.beneficiaryId);
    res.json({ success: true, data: list });
  } catch (err) {
    const r = _toErrorResponse(err);
    res.status(r.status).json(r.body);
  }
});

// ════════════════════════════════════════════════════════════════════════
// Health
// ════════════════════════════════════════════════════════════════════════

router.get('/_health', (req, res) => {
  res.json({
    success: true,
    data: {
      wave: 'W226',
      mountedAt: 'measures-workflow',
      endpoints: 9,
      services: [
        'W218 strategist',
        'W220 triggers',
        'W222 lifecycle',
        'W223 readinessGate',
        'W225 reminders (read-only)',
      ],
    },
  });
});

module.exports = router;
