'use strict';

/**
 * skills-gap.routes.js — HR competency gap-analysis surface (W1201).
 *
 * Mount: /api/hr/skills-gap + /api/v1/hr/skills-gap (self-authed → safe under the
 * plain hr.registry app.use mount, W1190/W1191).
 *
 *   POST /assessments               — record/update an employee competency level
 *   POST /requirements              — define a role's competency requirement (config)
 *   GET  /employee/:employeeId/gaps — one employee's gaps vs their role baseline
 *   GET  /org-gaps                  — branch-wide gap rollup (training priorities)
 *   GET  /training-needs            — top gaps matched to covering trainings
 *
 * SECURITY: employee-keyed calls go through enforceEmployeeBranch (W269); org reads
 * scope to effectiveBranchScope. Role baseline config is admin/HR-director only.
 */

const express = require('express');
const router = express.Router();

const { authenticateToken, requireRole } = require('../../middleware/auth');
const { requireBranchAccess } = require('../../middleware/branchScope.middleware');
const { effectiveBranchScope, enforceEmployeeBranch } = require('../../middleware/assertBranchMatch');
const safeError = require('../../utils/safeError');
const svc = require('../../services/hr/skillsGapService');

const READ_ROLES = ['admin', 'superadmin', 'super_admin', 'hr_manager', 'hr_director', 'hr', 'manager'];
const WRITE_ROLES = ['admin', 'superadmin', 'super_admin', 'hr_manager', 'hr_director', 'manager'];
const CONFIG_ROLES = ['admin', 'superadmin', 'super_admin', 'hr_director'];

router.use(authenticateToken);
router.use(requireBranchAccess);

function mapErr(res, err, ctx) {
  if (err && err.code === 'MODEL_UNAVAILABLE') return res.status(503).json({ success: false, error: err.message });
  if (err && err.code === 'VALIDATION') return res.status(400).json({ success: false, error: err.message });
  if (err && err.name === 'ValidationError') return res.status(400).json({ success: false, error: err.message });
  return safeError(res, err, ctx);
}

async function guardEmployee(req, res, employeeId) {
  try {
    await enforceEmployeeBranch(req, employeeId); // W269 — throws 403/404 cross-branch
    return false;
  } catch (err) {
    res.status(err.status || 403).json({ success: false, error: err.message });
    return true;
  }
}

/** POST /assessments — record/update an employee competency level. */
router.post('/assessments', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.employeeId) return res.status(400).json({ success: false, error: 'employeeId required' });
    if (await guardEmployee(req, res, b.employeeId)) return; // W269
    const actor = req.user || {};
    const doc = await svc.upsertAssessment({
      employeeId: b.employeeId,
      competencyKey: b.competencyKey,
      competencyNameAr: b.competencyNameAr,
      currentLevel: b.currentLevel,
      notes: b.notes,
      assessedBy: actor.id || actor._id || actor.userId || null,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    mapErr(res, err, 'skills-gap:assess');
  }
});

/** POST /requirements — define a role competency baseline (org-global config). */
router.post('/requirements', requireRole(CONFIG_ROLES), async (req, res) => {
  try {
    const b = req.body || {};
    const actor = req.user || {};
    const doc = await svc.upsertRequirement({
      jobTitle: b.jobTitle,
      competencyKey: b.competencyKey,
      competencyNameAr: b.competencyNameAr,
      requiredLevel: b.requiredLevel,
      criticality: b.criticality,
      createdBy: actor.id || actor._id || actor.userId || null,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    mapErr(res, err, 'skills-gap:requirement');
  }
});

/** GET /employee/:employeeId/gaps — one employee's gaps. */
router.get('/employee/:employeeId/gaps', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (await guardEmployee(req, res, req.params.employeeId)) return; // W269
    const data = await svc.employeeGaps({ employeeId: req.params.employeeId });
    if (!data) return res.status(404).json({ success: false, error: 'employee not found' });
    res.json({ success: true, data });
  } catch (err) {
    mapErr(res, err, 'skills-gap:employee');
  }
});

/** GET /org-gaps — branch-wide gap rollup. */
router.get('/org-gaps', requireRole(READ_ROLES), async (req, res) => {
  try {
    const branchId = effectiveBranchScope(req); // W269 — own branch or null (HQ)
    const data = await svc.orgGaps({ branchId, jobTitle: req.query.jobTitle ? String(req.query.jobTitle) : null });
    res.json({ success: true, data });
  } catch (err) {
    mapErr(res, err, 'skills-gap:org');
  }
});

/** GET /training-needs — top gaps → covering trainings. */
router.get('/training-needs', requireRole(READ_ROLES), async (req, res) => {
  try {
    const branchId = effectiveBranchScope(req);
    const data = await svc.trainingNeeds({ branchId, jobTitle: req.query.jobTitle ? String(req.query.jobTitle) : null });
    res.json({ success: true, data });
  } catch (err) {
    mapErr(res, err, 'skills-gap:training-needs');
  }
});

module.exports = router;
