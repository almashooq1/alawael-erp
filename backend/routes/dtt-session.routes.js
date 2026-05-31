'use strict';

/**
 * dtt-session.routes.js — Wave 689.
 *
 * ABA discrete-trial training session surface with trial-by-trial data.
 * Mounted via dualMountAuth at /api/(v1/)?dtt-session.
 *
 * Endpoints (10):
 *   GET    /                  — list w/ filters (paginated)
 *   GET    /by-beneficiary/:id — history + independent-correct trend
 *   GET    /stats
 *   GET    /:id
 *   POST   /                  — create session (scheduled or with targets)
 *   POST   /:id/record-data   — set/replace targets + trials
 *   POST   /:id/complete
 *   POST   /:id/cancel
 *   PATCH  /:id
 *   DELETE /:id               — admin-only
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const DttSession = require('../models/DttSession');
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
  'behavior_analyst',
  'bcba',
  'rbt',
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
  'behavior_analyst',
  'bcba',
  'rbt',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const { PROGRAM_AREAS, STATUSES, PROMPT_LEVELS, RESPONSES } = DttSession;

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

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

// Sanitize a client-supplied targets[] payload into the model shape.
function sanitizeTargets(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 30).map(t => ({
    targetName: String(t?.targetName || '').slice(0, 200),
    curriculumRef: String(t?.curriculumRef || '').slice(0, 120),
    masteryCriterionPct:
      typeof t?.masteryCriterionPct === 'number'
        ? Math.min(100, Math.max(0, t.masteryCriterionPct))
        : 80,
    masteryAchieved: !!t?.masteryAchieved,
    trials: Array.isArray(t?.trials)
      ? t.trials
          .slice(0, 200)
          .filter(
            tr =>
              PROMPT_LEVELS.includes(String(tr?.promptLevel)) &&
              RESPONSES.includes(String(tr?.response))
          )
          .map((tr, i) => ({
            sequence: typeof tr.sequence === 'number' ? tr.sequence : i + 1,
            promptLevel: String(tr.promptLevel),
            response: String(tr.response),
            notes: String(tr.notes || '').slice(0, 200),
          }))
      : [],
  }));
}

function independentCorrectRate(targets) {
  let total = 0;
  let ind = 0;
  for (const t of targets || []) {
    for (const tr of t.trials || []) {
      total++;
      if (tr.response === 'correct' && tr.promptLevel === 'independent') ind++;
    }
  }
  return total ? Math.round((ind / total) * 100) : null;
}

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
    if (req.query.programArea && PROGRAM_AREAS.includes(String(req.query.programArea))) {
      filter.programArea = String(req.query.programArea);
    }
    if (req.query.status && STATUSES.includes(String(req.query.status))) {
      filter.status = String(req.query.status);
    }
    if (req.query.from || req.query.to) {
      filter.sessionDate = {};
      if (req.query.from) filter.sessionDate.$gte = startOfDay(new Date(req.query.from));
      if (req.query.to) filter.sessionDate.$lte = endOfDay(new Date(req.query.to));
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [raw, total] = await Promise.all([
      DttSession.find(filter)
        .sort({ sessionDate: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      DttSession.countDocuments(filter),
    ]);
    // attach computed rate (lean docs lack virtuals)
    const withRate = raw.map(r => ({
      ...r,
      independentCorrectRate: independentCorrectRate(r.targets),
    }));
    const items = await hydrate(withRate);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'dtt.list');
  }
});

// ── GET /by-beneficiary/:id ────────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const raw = await DttSession.find({ ...branchFilter(req), beneficiaryId: req.params.id })
      .sort({ sessionDate: 1 })
      .limit(200)
      .lean();
    // Trend of independent-correct rate over completed sessions.
    const trend = raw
      .filter(r => r.status === 'completed')
      .map(r => ({
        sessionDate: r.sessionDate,
        programArea: r.programArea,
        independentCorrectRate: independentCorrectRate(r.targets),
      }));
    const items = raw
      .slice()
      .reverse()
      .map(r => ({ ...r, independentCorrectRate: independentCorrectRate(r.targets) }));
    res.json({ success: true, items, count: items.length, trend });
  } catch (err) {
    return safeError(res, err, 'dtt.byBeneficiary');
  }
});

// ── GET /stats ─────────────────────────────────────────────────────────
router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const from = req.query.from
      ? startOfDay(new Date(req.query.from))
      : startOfDay(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
    const to = req.query.to ? endOfDay(new Date(req.query.to)) : endOfDay(new Date());
    const filter = { ...branchFilter(req), sessionDate: { $gte: from, $lte: to } };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    const raw = await DttSession.find(filter).select('programArea status targets').lean();
    const byProgramArea = PROGRAM_AREAS.reduce((acc, a) => ((acc[a] = 0), acc), {});
    const byStatus = STATUSES.reduce((acc, s) => ((acc[s] = 0), acc), {});
    let completed = 0;
    let totalTrials = 0;
    let masteredTargets = 0;
    let rateSum = 0;
    let rateCount = 0;
    for (const r of raw) {
      byProgramArea[r.programArea] = (byProgramArea[r.programArea] || 0) + 1;
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      if (r.status === 'completed') completed++;
      for (const t of r.targets || []) {
        totalTrials += (t.trials || []).length;
        if (t.masteryAchieved) masteredTargets++;
      }
      const rate = independentCorrectRate(r.targets);
      if (rate != null) {
        rateSum += rate;
        rateCount++;
      }
    }
    res.json({
      success: true,
      from,
      to,
      total: raw.length,
      completed,
      totalTrials,
      masteredTargets,
      avgIndependentCorrectRate: rateCount ? Math.round(rateSum / rateCount) : null,
      byProgramArea,
      byStatus,
    });
  } catch (err) {
    return safeError(res, err, 'dtt.stats');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await DttSession.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });
    const obj = row.toObject({ virtuals: true });
    const [hydrated] = await hydrate([obj]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'dtt.get');
  }
});

// ── POST / — create session ────────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    if (!PROGRAM_AREAS.includes(String(body.programArea))) {
      return res
        .status(400)
        .json({ success: false, message: `المجال يجب أن يكون: ${PROGRAM_AREAS.join(' | ')}` });
    }
    const doc = await DttSession.create({
      beneficiaryId: body.beneficiaryId,
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      carePlanVersionId:
        body.carePlanVersionId && mongoose.isValidObjectId(body.carePlanVersionId)
          ? body.carePlanVersionId
          : null,
      behaviorPlanId:
        body.behaviorPlanId && mongoose.isValidObjectId(body.behaviorPlanId)
          ? body.behaviorPlanId
          : null,
      therapistId: req.user?.id || null,
      therapistName: req.user?.name || String(body.therapistName || '').slice(0, 100),
      sessionDate: body.sessionDate ? new Date(body.sessionDate) : new Date(),
      durationMinutes:
        typeof body.durationMinutes === 'number'
          ? Math.min(480, Math.max(0, body.durationMinutes))
          : null,
      programArea: body.programArea,
      targets: sanitizeTargets(body.targets),
      reinforcersUsed: Array.isArray(body.reinforcersUsed)
        ? body.reinforcersUsed.slice(0, 20).map(s => String(s).slice(0, 100))
        : [],
      behaviorsObserved: Array.isArray(body.behaviorsObserved)
        ? body.behaviorsObserved.slice(0, 20).map(s => String(s).slice(0, 100))
        : [],
      status: STATUSES.includes(String(body.status)) ? String(body.status) : 'scheduled',
      sessionNotes: String(body.sessionNotes || '').slice(0, 1000),
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'dtt.create');
  }
});

// ── POST /:id/record-data — set/replace targets + trials ───────────────
router.post('/:id/record-data', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await DttSession.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });
    if (['completed', 'cancelled'].includes(row.status)) {
      return res.status(409).json({ success: false, message: 'لا يمكن تعديل بيانات جلسة منتهية' });
    }
    const b = req.body || {};
    if (Array.isArray(b.targets)) row.targets = sanitizeTargets(b.targets);
    if (Array.isArray(b.reinforcersUsed))
      row.reinforcersUsed = b.reinforcersUsed.slice(0, 20).map(s => String(s).slice(0, 100));
    if (Array.isArray(b.behaviorsObserved))
      row.behaviorsObserved = b.behaviorsObserved.slice(0, 20).map(s => String(s).slice(0, 100));
    if (b.sessionNotes != null) row.sessionNotes = String(b.sessionNotes).slice(0, 1000);
    await row.save();
    res.json({ success: true, data: row.toObject({ virtuals: true }) });
  } catch (err) {
    return safeError(res, err, 'dtt.recordData');
  }
});

// ── POST /:id/complete ─────────────────────────────────────────────────
router.post('/:id/complete', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await DttSession.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });
    if (['completed', 'cancelled'].includes(row.status)) {
      return res.status(409).json({ success: false, message: 'الجلسة منتهية بالفعل' });
    }
    const b = req.body || {};
    if (Array.isArray(b.targets)) row.targets = sanitizeTargets(b.targets);
    if (b.sessionNotes != null) row.sessionNotes = String(b.sessionNotes).slice(0, 1000);
    row.status = 'completed';
    await row.save(); // invariant enforces ≥1 target with trials
    res.json({ success: true, data: row.toObject({ virtuals: true }) });
  } catch (err) {
    return safeError(res, err, 'dtt.complete');
  }
});

// ── POST /:id/cancel ───────────────────────────────────────────────────
router.post('/:id/cancel', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const reason = String(req.body?.cancelReason || '').slice(0, 300);
    if (!reason.trim()) {
      return res.status(400).json({ success: false, message: 'سبب الإلغاء مطلوب' });
    }
    const row = await DttSession.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });
    if (row.status === 'completed') {
      return res.status(409).json({ success: false, message: 'لا يمكن إلغاء جلسة مكتملة' });
    }
    row.status = 'cancelled';
    row.cancelReason = reason;
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'dtt.cancel');
  }
});

// ── PATCH /:id ─────────────────────────────────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await DttSession.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });
    if (['completed', 'cancelled'].includes(row.status)) {
      return res.status(409).json({ success: false, message: 'لا يمكن تعديل جلسة منتهية' });
    }
    const editable = ['programArea', 'sessionDate', 'durationMinutes', 'sessionNotes'];
    for (const k of editable) {
      if (k in req.body) row[k] = req.body[k];
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'dtt.patch');
  }
});

// ── DELETE /:id — admin-only ───────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await DttSession.findOneAndDelete({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'dtt.delete');
  }
});

module.exports = router;
