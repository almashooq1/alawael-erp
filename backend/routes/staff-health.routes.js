'use strict';

/**
 * staff-health.routes.js — W1125.
 *
 * Occupational-health surveillance for staff (immunization / TB / fitness /
 * exposure incidents / fit-test). Mounted at /api/(v1/)?staff-health via
 * features.registry (dualMountAuth).
 *
 * CONFIDENTIAL surface: READ is restricted to occupational-health / HR /
 * physician / management roles — NOT broad clinical staff. Branch-isolated
 * (requireBranchAccess + branchFilter, never the forbidden req-level branchId
 * read); every :id mutation re-scopes by branch; explicit field whitelist on
 * create/update (anti mass-assignment).
 *
 * Endpoints:
 *   GET    /                       — list (employeeId/recordType/status filters)
 *   GET    /by-employee/:employeeId — one staff member's occ-health history
 *   GET    /due                    — surveillance overdue (nextDueDate passed)
 *   GET    /exposures              — exposure-incident log
 *   GET    /restricted             — staff currently on work restrictions
 *   GET    /stats
 *   GET    /:id
 *   POST   /
 *   PATCH  /:id
 *   POST   /:id/complete           — → completed|cleared (outcome + nextDueDate)
 *   POST   /:id/restrict           — → restricted (restrictions text)
 *   POST   /:id/close              — → closed
 *   DELETE /:id                    — admin soft-delete
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { requireRole } = require('../middleware/auth');
const { branchFilter, requireBranchAccess } = require('../middleware/branchScope.middleware');
const { effectiveBranchScope } = require('../middleware/assertBranchMatch');
const safeError = require('../utils/safeError');

const Health = require('../models/StaffHealthRecord');
const { TYPES, STATUSES } = Health;

// Confidential read — occupational-health data is sensitive.
const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'branch_manager',
  'hr',
  'hr_manager',
  'occupational_health',
  'physician',
  'compliance',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'branch_manager',
  'hr',
  'hr_manager',
  'occupational_health',
  'physician',
];
// Clinical decisions (clearance / restriction / closure) — clinicians + occ-health.
const CLINICAL_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'occupational_health',
  'physician',
  'hr_manager',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

router.use(requireBranchAccess);

const num = (v, d) =>
  v === undefined || v === null || v === '' || isNaN(Number(v)) ? d : Number(v);
const bad = (res, msg) => res.status(400).json({ success: false, message: msg });

// ── List ────────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req), deletedAt: null };
    if (req.query.recordType && TYPES.includes(req.query.recordType))
      filter.recordType = req.query.recordType;
    if (req.query.status && STATUSES.includes(req.query.status)) filter.status = req.query.status;
    if (mongoose.isValidObjectId(req.query.employeeId)) filter.employeeId = req.query.employeeId;
    const limit = Math.min(num(req.query.limit, 100), 500);
    const rows = await Health.find(filter).sort({ eventDate: -1 }).limit(limit);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    return safeError(res, err, 'staff-health.list');
  }
});

// ── One employee's occ-health history ───────────────────────────────
router.get('/by-employee/:employeeId', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.employeeId)) return bad(res, 'معرّف الموظف غير صالح');
    const rows = await Health.find({
      ...branchFilter(req),
      deletedAt: null,
      employeeId: req.params.employeeId,
    }).sort({ eventDate: -1 });
    res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    return safeError(res, err, 'staff-health.by-employee');
  }
});

// ── Cohorts ─────────────────────────────────────────────────────────
router.get('/due', requireRole(READ_ROLES), async (req, res) => {
  try {
    const rows = await Health.find({
      ...branchFilter(req),
      deletedAt: null,
      status: { $nin: ['closed'] },
      nextDueDate: { $ne: null, $lte: new Date() },
    }).sort({ nextDueDate: 1 });
    res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    return safeError(res, err, 'staff-health.due');
  }
});

router.get('/exposures', requireRole(READ_ROLES), async (req, res) => {
  try {
    const rows = await Health.find({
      ...branchFilter(req),
      deletedAt: null,
      recordType: 'exposure_incident',
    }).sort({ eventDate: -1 });
    res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    return safeError(res, err, 'staff-health.exposures');
  }
});

router.get('/restricted', requireRole(READ_ROLES), async (req, res) => {
  try {
    const rows = await Health.find({
      ...branchFilter(req),
      deletedAt: null,
      status: 'restricted',
    }).sort({ eventDate: -1 });
    res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    return safeError(res, err, 'staff-health.restricted');
  }
});

router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req), deletedAt: null };
    const match = { deletedAt: null, ...(filter.branchId ? { branchId: filter.branchId } : {}) };
    const [total, byType, dueRows] = await Promise.all([
      Health.countDocuments(filter),
      Health.aggregate([{ $match: match }, { $group: { _id: '$recordType', n: { $sum: 1 } } }]),
      Health.find({
        ...filter,
        status: { $nin: ['closed'] },
        nextDueDate: { $ne: null, $lte: new Date() },
      }),
    ]);
    res.json({
      success: true,
      data: {
        total,
        byType: byType.reduce((m, t) => ((m[t._id] = t.n), m), {}),
        overdueSurveillance: dueRows.length,
        restricted: await Health.countDocuments({ ...filter, status: 'restricted' }),
      },
    });
  } catch (err) {
    return safeError(res, err, 'staff-health.stats');
  }
});

// ── Read one ────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 'معرّف غير صالح');
    const row = await Health.findOne({ _id: req.params.id, ...branchFilter(req), deletedAt: null });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'staff-health.get');
  }
});

// ── Create ──────────────────────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const b = req.body || {};
    if (!mongoose.isValidObjectId(b.employeeId)) return bad(res, 'معرّف الموظف مطلوب');
    if (!TYPES.includes(b.recordType)) return bad(res, 'نوع السجل غير صالح');
    const branchId =
      effectiveBranchScope(req) || (mongoose.isValidObjectId(b.branchId) ? b.branchId : null);

    const doc = await Health.create({
      employeeId: b.employeeId,
      employeeName: b.employeeName,
      branchId,
      recordType: b.recordType,
      eventDate: b.eventDate ? new Date(b.eventDate) : new Date(),
      nextDueDate: b.nextDueDate ? new Date(b.nextDueDate) : null,
      outcome: b.outcome,
      findings: b.findings,
      vaccineName: b.vaccineName,
      doseNumber: num(b.doseNumber, null),
      administeredDate: b.administeredDate ? new Date(b.administeredDate) : null,
      lotNumber: b.lotNumber,
      exposureType: b.exposureType,
      sourcePatientKnown: b.sourcePatientKnown === true,
      bodyFluidType: b.bodyFluidType,
      postExposureProphylaxis: b.postExposureProphylaxis,
      reportedWithin2h: b.reportedWithin2h === true,
      fitnessLevel: b.fitnessLevel,
      result: b.result,
      confidential: b.confidential !== false,
      assessedByName: b.assessedByName,
      assessedBy: req.user && mongoose.isValidObjectId(req.user.id) ? req.user.id : undefined,
      notes: b.notes,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    if (err.name === 'ValidationError') return bad(res, err.message);
    return safeError(res, err, 'staff-health.create');
  }
});

// ── Update mutable fields ───────────────────────────────────────────
const MUTABLE = [
  'employeeName',
  'nextDueDate',
  'outcome',
  'findings',
  'vaccineName',
  'doseNumber',
  'administeredDate',
  'lotNumber',
  'exposureType',
  'sourcePatientKnown',
  'bodyFluidType',
  'postExposureProphylaxis',
  'reportedWithin2h',
  'fitnessLevel',
  'result',
  'assessedByName',
  'notes',
];
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 'معرّف غير صالح');
    const row = await Health.findOne({ _id: req.params.id, ...branchFilter(req), deletedAt: null });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    for (const k of MUTABLE) {
      if (req.body[k] !== undefined) row[k] = req.body[k];
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    if (err.name === 'ValidationError') return bad(res, err.message);
    return safeError(res, err, 'staff-health.update');
  }
});

// ── Lifecycle transitions ───────────────────────────────────────────
router.post('/:id/complete', requireRole(CLINICAL_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 'معرّف غير صالح');
    const row = await Health.findOne({ _id: req.params.id, ...branchFilter(req), deletedAt: null });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    row.status = req.body?.cleared === true ? 'cleared' : 'completed';
    if (req.body?.outcome) row.outcome = String(req.body.outcome).slice(0, 1000);
    if (req.body?.fitnessLevel) row.fitnessLevel = req.body.fitnessLevel;
    if (req.body?.result) row.result = req.body.result;
    if (req.body?.nextDueDate) row.nextDueDate = new Date(req.body.nextDueDate);
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    if (err.name === 'ValidationError') return bad(res, err.message);
    return safeError(res, err, 'staff-health.complete');
  }
});

router.post('/:id/restrict', requireRole(CLINICAL_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 'معرّف غير صالح');
    const row = await Health.findOne({ _id: req.params.id, ...branchFilter(req), deletedAt: null });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (!String(req.body?.restrictions || '').trim()) return bad(res, 'نص القيود مطلوب');
    row.restrictions = String(req.body.restrictions).slice(0, 1000);
    row.fitnessLevel = 'fit_with_restrictions';
    row.status = 'restricted';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    if (err.name === 'ValidationError') return bad(res, err.message);
    return safeError(res, err, 'staff-health.restrict');
  }
});

router.post('/:id/close', requireRole(CLINICAL_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 'معرّف غير صالح');
    const row = await Health.findOne({ _id: req.params.id, ...branchFilter(req), deletedAt: null });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    row.status = 'closed';
    if (req.body?.outcome) row.outcome = String(req.body.outcome).slice(0, 1000);
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    if (err.name === 'ValidationError') return bad(res, err.message);
    return safeError(res, err, 'staff-health.close');
  }
});

// ── Soft-delete (admin) ─────────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 'معرّف غير صالح');
    const row = await Health.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    row.deletedAt = new Date();
    await row.save();
    res.json({ success: true, message: 'تم الحذف' });
  } catch (err) {
    return safeError(res, err, 'staff-health.delete');
  }
});

module.exports = router;
