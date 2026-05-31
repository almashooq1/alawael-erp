'use strict';

/**
 * sensory-diet.routes.js — Wave 691.
 *
 * Sensory-diet program + Snoezelen-session surface. Mounted via
 * dualMountAuth at /api/(v1/)?sensory-diet.
 *
 * Endpoints (10):
 *   GET    /review-due               — active programs past review date
 *   GET    /                         — list w/ filters (paginated)
 *   GET    /by-beneficiary/:id
 *   GET    /stats
 *   GET    /:id
 *   POST   /                         — create program
 *   POST   /:id/snoezelen-session    — log a multisensory-room session
 *   POST   /:id/transition           — status state machine
 *   PATCH  /:id                      — edit activities/goals/review while active
 *   DELETE /:id                      — admin-only
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const SensoryDietProgram = require('../models/SensoryDietProgram');
const Beneficiary = require('../models/Beneficiary');
const safeError = require('../utils/safeError');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { bodyScopedBeneficiaryGuard } = require('../middleware/assertBranchMatch');

router.use(authenticateToken);
router.use(requireBranchAccess);
router.use(bodyScopedBeneficiaryGuard);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'occupational_therapist',
  'psychologist',
  'quality',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'occupational_therapist',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const { STATUSES, SENSORY_SYSTEMS, PURPOSES, REGULATION_OUTCOMES } = SensoryDietProgram;

// status state machine
const TRANSITIONS = {
  active: ['on_hold', 'completed', 'discontinued'],
  on_hold: ['active', 'discontinued'],
  completed: [],
  discontinued: [],
};

async function hydrate(items) {
  const ids = [...new Set(items.map(r => String(r.beneficiaryId)).filter(Boolean))].filter(id =>
    mongoose.isValidObjectId(id)
  );
  const benefs = ids.length
    ? await Beneficiary.find({ _id: { $in: ids } })
        .select('firstName_ar lastName_ar beneficiaryNumber')
        .lean()
    : [];
  const map = new Map(benefs.map(b => [String(b._id), b]));
  return items.map(r => ({ ...r, beneficiary: map.get(String(r.beneficiaryId)) || null }));
}

function sanitizeActivities(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .slice(0, 40)
    .filter(
      a =>
        SENSORY_SYSTEMS.includes(String(a?.sensorySystem)) && PURPOSES.includes(String(a?.purpose))
    )
    .map(a => ({
      name: String(a.name || '').slice(0, 200),
      sensorySystem: String(a.sensorySystem),
      purpose: String(a.purpose),
      frequency: String(a.frequency || '').slice(0, 100),
      durationMinutes:
        typeof a.durationMinutes === 'number'
          ? Math.min(240, Math.max(0, a.durationMinutes))
          : null,
      equipment: Array.isArray(a.equipment)
        ? a.equipment.slice(0, 15).map(s => String(s).slice(0, 80))
        : [],
      instructions: String(a.instructions || '').slice(0, 500),
    }));
}

// ── GET /review-due ────────────────────────────────────────────────────
router.get('/review-due', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = {
      ...branchFilter(req),
      status: 'active',
      reviewDate: { $ne: null, $lt: new Date() },
    };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await SensoryDietProgram.find(filter).sort({ reviewDate: 1 }).limit(200).lean();
    const items = await hydrate(raw);
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'sensoryDiet.reviewDue');
  }
});

// ── GET / ──────────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req) };
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.status && STATUSES.includes(String(req.query.status))) {
      filter.status = String(req.query.status);
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [raw, total] = await Promise.all([
      SensoryDietProgram.find(filter)
        .sort({ status: 1, startDate: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      SensoryDietProgram.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'sensoryDiet.list');
  }
});

// ── GET /by-beneficiary/:id ────────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await SensoryDietProgram.find({
      ...branchFilter(req),
      beneficiaryId: req.params.id,
    })
      .sort({ startDate: -1 })
      .limit(100)
      .lean();
    const activeProgram = items.find(r => r.status === 'active') || null;
    res.json({ success: true, items, count: items.length, activeProgram });
  } catch (err) {
    return safeError(res, err, 'sensoryDiet.byBeneficiary');
  }
});

// ── GET /stats ─────────────────────────────────────────────────────────
router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req) };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await SensoryDietProgram.find(filter)
      .select('status reviewDate snoezelenSessions')
      .lean();
    const byStatus = STATUSES.reduce((acc, s) => ((acc[s] = 0), acc), {});
    let reviewOverdue = 0;
    let snoezelenSessions = 0;
    let regulatedSessions = 0;
    const now = Date.now();
    for (const r of raw) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      if (r.status === 'active' && r.reviewDate && new Date(r.reviewDate).getTime() < now)
        reviewOverdue++;
      for (const s of r.snoezelenSessions || []) {
        snoezelenSessions++;
        if (s.regulationOutcome === 'regulated' || s.regulationOutcome === 'partially_regulated')
          regulatedSessions++;
      }
    }
    res.json({
      success: true,
      total: raw.length,
      active: byStatus.active || 0,
      reviewOverdue,
      snoezelenSessions,
      regulatedSessions,
      regulatedRate: snoezelenSessions
        ? Math.round((regulatedSessions / snoezelenSessions) * 100)
        : null,
      byStatus,
    });
  } catch (err) {
    return safeError(res, err, 'sensoryDiet.stats');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await SensoryDietProgram.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    const [hydrated] = await hydrate([row.toObject({ virtuals: true })]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'sensoryDiet.get');
  }
});

// ── POST / — create program ────────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    const doc = await SensoryDietProgram.create({
      beneficiaryId: body.beneficiaryId,
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      carePlanVersionId:
        body.carePlanVersionId && mongoose.isValidObjectId(body.carePlanVersionId)
          ? body.carePlanVersionId
          : null,
      sensoryProfileAssessmentId:
        body.sensoryProfileAssessmentId && mongoose.isValidObjectId(body.sensoryProfileAssessmentId)
          ? body.sensoryProfileAssessmentId
          : null,
      therapistId: req.user?.id || null,
      therapistName: req.user?.name || String(body.therapistName || '').slice(0, 100),
      startDate: body.startDate ? new Date(body.startDate) : new Date(),
      reviewDate: body.reviewDate ? new Date(body.reviewDate) : null,
      goals: Array.isArray(body.goals)
        ? body.goals.slice(0, 20).map(s => String(s).slice(0, 200))
        : [],
      activities: sanitizeActivities(body.activities),
      notes: String(body.notes || '').slice(0, 1000),
      status: 'active',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'sensoryDiet.create');
  }
});

// ── POST /:id/snoezelen-session — log a room session ───────────────────
router.post('/:id/snoezelen-session', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const b = req.body || {};
    if (!REGULATION_OUTCOMES.includes(String(b.regulationOutcome))) {
      return res
        .status(400)
        .json({
          success: false,
          message: `نتيجة التنظيم يجب أن تكون: ${REGULATION_OUTCOMES.join(' | ')}`,
        });
    }
    const row = await SensoryDietProgram.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    if (['completed', 'discontinued'].includes(row.status)) {
      return res.status(409).json({ success: false, message: 'لا يمكن إضافة جلسة لبرنامج منتهٍ' });
    }
    row.snoezelenSessions.push({
      date: b.date ? new Date(b.date) : new Date(),
      durationMinutes:
        typeof b.durationMinutes === 'number'
          ? Math.min(240, Math.max(0, b.durationMinutes))
          : null,
      room: String(b.room || '').slice(0, 100),
      stimuliUsed: Array.isArray(b.stimuliUsed)
        ? b.stimuliUsed.slice(0, 15).map(s => String(s).slice(0, 80))
        : [],
      regulationOutcome: String(b.regulationOutcome),
      responseNotes: String(b.responseNotes || '').slice(0, 500),
      byName: req.user?.name || String(b.byName || '').slice(0, 100),
    });
    await row.save();
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'sensoryDiet.snoezelenSession');
  }
});

// ── POST /:id/transition — status state machine ────────────────────────
router.post('/:id/transition', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const toStatus = String(req.body?.toStatus || '');
    if (!STATUSES.includes(toStatus)) {
      return res.status(400).json({ success: false, message: `حالة غير معروفة: ${toStatus}` });
    }
    const row = await SensoryDietProgram.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    const allowed = TRANSITIONS[row.status] || [];
    if (!allowed.includes(toStatus)) {
      return res
        .status(409)
        .json({
          success: false,
          message: `لا يمكن الانتقال من ${row.status} إلى ${toStatus}`,
          allowed,
        });
    }
    if (toStatus === 'discontinued') {
      row.discontinueReason = String(req.body?.discontinueReason || '').slice(0, 300);
    }
    row.status = toStatus;
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'sensoryDiet.transition');
  }
});

// ── PATCH /:id — edit while not terminal ───────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await SensoryDietProgram.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    if (['completed', 'discontinued'].includes(row.status)) {
      return res.status(409).json({ success: false, message: 'لا يمكن تعديل برنامج منتهٍ' });
    }
    const b = req.body || {};
    if (Array.isArray(b.activities)) row.activities = sanitizeActivities(b.activities);
    if (Array.isArray(b.goals)) row.goals = b.goals.slice(0, 20).map(s => String(s).slice(0, 200));
    if ('reviewDate' in b) row.reviewDate = b.reviewDate ? new Date(b.reviewDate) : null;
    if (b.reviewNotes != null) row.reviewNotes = String(b.reviewNotes).slice(0, 1000);
    if (b.notes != null) row.notes = String(b.notes).slice(0, 1000);
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'sensoryDiet.patch');
  }
});

// ── DELETE /:id — admin-only ───────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await SensoryDietProgram.findOneAndDelete({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'sensoryDiet.delete');
  }
});

module.exports = router;
