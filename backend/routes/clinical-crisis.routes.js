'use strict';

/**
 * clinical-crisis.routes.js — W524.
 *
 * REST surface for the W458 `crisisOrchestrator.service` — the Phase A
 * Dimension F (Crisis Readiness) orchestration layer over W356
 * SeizureEvent + W357 SafeguardingConcern. The service shipped in W458
 * with a fully documented 5-method API + 36 unit assertions but NO
 * route layer — the W522/W523 dormant-modules audit
 * (docs/audits/dormant-modules-triage-2026-05-28.md) flagged it as the
 * #1 "build landed, wire-up missed" gap.
 *
 * IMPORTANT — domain boundary (ADR-033): this is the BENEFICIARY
 * CLINICAL crisis surface (a specific child's seizure / safeguarding
 * event), distinct from the facility-emergency-management surface at
 * `/api/crisis` (`routes/crisis.routes.js` + `models/crisis.model.js`).
 * The two are intentionally separate — do NOT reconcile them as
 * duplicates. Hence this route mounts at `/api/clinical-crisis`, not a
 * misleading `/api/crisis/v2`.
 *
 * MFA (ADR-019): reporting a crisis + closing-with-review are tier-2
 * (the service's own doc-comment mandates this); escalate / link / read
 * are tier-1. Mirrors ai-recommendations.routes.js MFA wiring.
 *
 * Branch isolation (W269 contract): CrisisIncident carries `branchId`.
 *   • report  → enforceBeneficiaryBranch(beneficiaryId) + branchId from
 *               effectiveBranchScope (ignores body spoofing for
 *               restricted callers).
 *   • read/escalate/close/link → load the incident, assertBranchMatch
 *               on its branchId before delegating to the service.
 *   • active list → effectiveBranchScope (never trusts ?branchId= for a
 *               restricted caller).
 *
 * Endpoints (mounted at /api/(v1/)?clinical-crisis):
 *   GET    /health                 — service constants (no auth)
 *   GET    /active                 — active/escalated/under_review list (tier 1)
 *   GET    /:id                    — one incident                       (tier 1)
 *   POST   /                       — report a crisis                    (tier 2)
 *   POST   /:id/escalate           — append an escalation action        (tier 1)
 *   POST   /:id/close              — close with post-incident review     (tier 2)
 *   POST   /:id/link               — link a SeizureEvent / SafeguardingConcern (tier 1)
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const { authenticate, requireRole } = require('../middleware/auth');
const { attachMfaActor, requireMfaTier } = require('../middleware/requireMfaTier');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const {
  assertBranchMatch,
  effectiveBranchScope,
  enforceBeneficiaryBranch,
} = require('../middleware/assertBranchMatch');
const safeError = require('../utils/safeError');

const orchestrator = require('../services/crisisOrchestrator.service');

// Crisis reporting is intentionally permissive — any clinical staff must
// be able to raise an incident the moment it happens. Triage/close stays
// tighter (supervisors + leads + physician).
const REPORT_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'branch_manager',
  'clinical_supervisor',
  'safeguarding_lead',
  'physician',
  'nurse',
  'therapist',
  'teacher',
  'quality',
];
const READ_ROLES = REPORT_ROLES;
const MANAGE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'branch_manager',
  'clinical_supervisor',
  'safeguarding_lead',
  'physician',
];

// Map a service-thrown Error to an HTTP response. The orchestrator
// throws plain Errors with `<method>: <reason>` messages; the branch
// helpers throw Errors carrying `err.status`. Everything else → 500 via
// safeError (which redacts internals in prod).
function mapError(res, err, context) {
  if (err && typeof err.status === 'number') {
    return res.status(err.status).json({ success: false, message: err.message });
  }
  const msg = String((err && err.message) || '');
  if (/not found/i.test(msg)) {
    return res.status(404).json({ success: false, message: msg });
  }
  if (/required|invalid/i.test(msg)) {
    return res.status(400).json({ success: false, message: msg });
  }
  return safeError(res, err, context);
}

function _CrisisIncident() {
  try {
    return mongoose.model('CrisisIncident');
  } catch {
    require('../models/CrisisIncident');
    return mongoose.model('CrisisIncident');
  }
}

// Load an incident by id + assert the caller's branch owns it. Returns
// the incident, or sends a 400/404 response and returns null. Throws
// (403) via assertBranchMatch on a cross-branch attempt — caught by the
// caller's try/catch → mapError.
async function loadOwnedIncident(req, res) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    return null;
  }
  const incident = await _CrisisIncident().findById(id).lean();
  if (!incident) {
    res.status(404).json({ success: false, message: 'الحادث غير موجود' });
    return null;
  }
  assertBranchMatch(req, incident.branchId, 'clinical crisis incident'); // throws 403 on mismatch
  return incident;
}

// ── GET /health (no auth) ──────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    crisisTypes: orchestrator.ALLOWED_TYPES,
    severities: orchestrator.ALLOWED_SEVERITIES,
    actionTypes: orchestrator.ALLOWED_ACTION_TYPES,
  });
});

router.use(authenticate);
router.use(attachMfaActor);
router.use(requireBranchAccess);

// ── GET /active ────────────────────────────────────────────────────────
router.get('/active', requireMfaTier(1), requireRole(READ_ROLES), async (req, res) => {
  try {
    const branchId = effectiveBranchScope(req) || req.query.branchId;
    if (!branchId) {
      return res
        .status(400)
        .json({ success: false, message: 'branchId مطلوب (أو نطاق فرع للمستخدم)' });
    }
    const severity =
      req.query.severity && orchestrator.ALLOWED_SEVERITIES.includes(String(req.query.severity))
        ? String(req.query.severity)
        : undefined;
    const items = await orchestrator.getActive({ branchId: String(branchId), severity });
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return mapError(res, err, 'clinical-crisis.active');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────────
router.get('/:id', requireMfaTier(1), requireRole(READ_ROLES), async (req, res) => {
  try {
    const incident = await loadOwnedIncident(req, res);
    if (!incident) return undefined;
    res.json({ success: true, incident });
  } catch (err) {
    return mapError(res, err, 'clinical-crisis.get');
  }
});

// ── POST / — report a crisis (tier 2) ──────────────────────────────────
router.post('/', requireMfaTier(2), requireRole(REPORT_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    // Cross-branch isolation: a restricted caller may only report a
    // crisis for a beneficiary in their own branch, and the incident's
    // branchId is forced to the caller's scope (body value ignored).
    await enforceBeneficiaryBranch(req, body.beneficiaryId);
    const branchId = effectiveBranchScope(req) || body.branchId;
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'branchId مطلوب' });
    }
    const result = await orchestrator.reportCrisis({
      beneficiaryId: body.beneficiaryId,
      branchId: String(branchId),
      crisisType: body.crisisType,
      severity: body.severity,
      description: body.description,
      occurredAt: body.occurredAt,
      reportedBy: req.user && (req.user.id || req.user._id),
      seizureEventId: body.seizureEventId,
      safeguardingConcernId: body.safeguardingConcernId,
      correlationId: body.correlationId,
    });
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    return mapError(res, err, 'clinical-crisis.report');
  }
});

// ── POST /:id/escalate (tier 1) ────────────────────────────────────────
router.post('/:id/escalate', requireMfaTier(1), requireRole(MANAGE_ROLES), async (req, res) => {
  try {
    const owned = await loadOwnedIncident(req, res);
    if (!owned) return undefined;
    const body = req.body || {};
    const incident = await orchestrator.escalate({
      crisisId: req.params.id,
      actionType: body.actionType,
      performedBy: req.user && (req.user.id || req.user._id),
      outcome: body.outcome,
      notes: body.notes,
    });
    res.json({ success: true, incident });
  } catch (err) {
    return mapError(res, err, 'clinical-crisis.escalate');
  }
});

// ── POST /:id/close — close with post-incident review (tier 2) ─────────
router.post('/:id/close', requireMfaTier(2), requireRole(MANAGE_ROLES), async (req, res) => {
  try {
    const owned = await loadOwnedIncident(req, res);
    if (!owned) return undefined;
    const body = req.body || {};
    const incident = await orchestrator.closeWithReview({
      crisisId: req.params.id,
      reviewerId: req.user && (req.user.id || req.user._id),
      capaItemId: body.capaItemId,
    });
    res.json({ success: true, incident });
  } catch (err) {
    return mapError(res, err, 'clinical-crisis.close');
  }
});

// ── POST /:id/link — link a specialized record (tier 1) ────────────────
router.post('/:id/link', requireMfaTier(1), requireRole(MANAGE_ROLES), async (req, res) => {
  try {
    const owned = await loadOwnedIncident(req, res);
    if (!owned) return undefined;
    const body = req.body || {};
    const incident = await orchestrator.linkSpecializedRecord({
      crisisId: req.params.id,
      type: body.type,
      recordId: body.recordId,
    });
    res.json({ success: true, incident });
  } catch (err) {
    return mapError(res, err, 'clinical-crisis.link');
  }
});

module.exports = router;
