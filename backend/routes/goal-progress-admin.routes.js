/**
 * goal-progress-admin.routes.js — Care-plan goal progress admin.
 *
 * Mount at /api/admin/goal-progress.
 *
 * Endpoints:
 *   GET    /                         paginated list + filters
 *   GET    /goal/:goalId             full trajectory for one goal
 *   GET    /beneficiary/:id          per-beneficiary rollup + stalled
 *   GET    /overview                 trend distribution + stalled watchlist
 *   POST   /                         record progress (therapist session-end)
 *   PATCH  /:id                      correct an entry
 *   DELETE /:id                      (admin only)
 *   GET    /export.csv
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const GoalProgressEntry = require('../models/GoalProgressEntry');
const Beneficiary = require('../models/Beneficiary');
const gp = require('../services/goalProgressService');
const safeError = require('../utils/safeError');

router.use(authenticateToken);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'hr',
  'clinical_supervisor',
  'therapist',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
];
const ADMIN_ROLES = ['admin', 'superadmin', 'super_admin', 'manager'];

function buildFilter(q) {
  const f = {};
  if (q.beneficiaryId && mongoose.isValidObjectId(q.beneficiaryId))
    f.beneficiaryId = q.beneficiaryId;
  if (q.goalId && mongoose.isValidObjectId(q.goalId)) f.goalId = q.goalId;
  if (q.carePlanId && mongoose.isValidObjectId(q.carePlanId)) f.carePlanId = q.carePlanId;
  if (q.from || q.to) {
    f.recordedAt = {};
    if (q.from) f.recordedAt.$gte = new Date(q.from);
    if (q.to) {
      const d = new Date(q.to);
      d.setHours(23, 59, 59, 999);
      f.recordedAt.$lte = d;
    }
  }
  return f;
}

router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [items, total] = await Promise.all([
      GoalProgressEntry.find(filter)
        .sort({ recordedAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      GoalProgressEntry.countDocuments(filter),
    ]);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'goal-progress.list');
  }
});

router.get('/goal/:goalId', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.goalId))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const items = await GoalProgressEntry.find({ goalId: req.params.goalId })
      .sort({ recordedAt: 1 })
      .lean();
    const series = gp.trajectory(items);
    res.json({
      success: true,
      count: items.length,
      trajectory: series,
      verdict: gp.verdict(series),
    });
  } catch (err) {
    return safeError(res, err, 'goal-progress.byGoal');
  }
});

router.get('/beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const items = await GoalProgressEntry.find({ beneficiaryId: req.params.id }).lean();
    const summary = gp.summarizeByBeneficiary(items);
    const byGoal = gp.groupByGoal(items);
    const stalled = gp.detectStalled(byGoal);
    res.json({ success: true, summary, stalled, count: items.length });
  } catch (err) {
    return safeError(res, err, 'goal-progress.byBeneficiary');
  }
});

router.get('/overview', requireRole(READ_ROLES), async (req, res) => {
  try {
    const ninetyDays = new Date(Date.now() - 90 * 86400000);
    const items = await GoalProgressEntry.find({ recordedAt: { $gte: ninetyDays } }).lean();
    const byGoal = gp.groupByGoal(items);
    const stalled = gp.detectStalled(byGoal);
    // Roll up per beneficiary for trend distribution.
    const byBenef = new Map();
    for (const e of items) {
      const id = String(e.beneficiaryId);
      if (!byBenef.has(id)) byBenef.set(id, []);
      byBenef.get(id).push(e);
    }
    const verdictCounts = {
      achieved: 0,
      improving: 0,
      steady: 0,
      declining: 0,
      stalled: 0,
      insufficient: 0,
    };
    for (const [, entries] of byBenef) {
      const s = gp.summarizeByBeneficiary(entries);
      for (const [v, c] of Object.entries(s.verdictCounts)) verdictCounts[v] += c;
    }
    res.json({
      success: true,
      windowDays: 90,
      totalBeneficiaries: byBenef.size,
      verdictCounts,
      stalled,
    });
  } catch (err) {
    return safeError(res, err, 'goal-progress.overview');
  }
});

router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const { carePlanId, goalId, beneficiaryId, progressPercent } = req.body || {};
    if (!carePlanId || !mongoose.isValidObjectId(carePlanId))
      return res.status(400).json({ success: false, message: 'carePlanId مطلوب' });
    if (!goalId || !mongoose.isValidObjectId(goalId))
      return res.status(400).json({ success: false, message: 'goalId مطلوب' });
    if (!beneficiaryId || !mongoose.isValidObjectId(beneficiaryId))
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    const p = Number(progressPercent);
    if (!Number.isFinite(p) || p < 0 || p > 100)
      return res
        .status(400)
        .json({ success: false, message: 'progressPercent يجب أن يكون 0..100' });
    const row = await GoalProgressEntry.create({
      ...req.body,
      carePlanId,
      goalId,
      beneficiaryId,
      progressPercent: p,
      recordedBy: req.user?.id,
      recordedAt: req.body.recordedAt ? new Date(req.body.recordedAt) : new Date(),
    });
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'goal-progress.create');
  }
});

router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const body = { ...(req.body || {}) };
    delete body.carePlanId;
    delete body.goalId;
    delete body.beneficiaryId;
    if (body.progressPercent != null) body.progressPercent = Number(body.progressPercent);
    const row = await GoalProgressEntry.findByIdAndUpdate(req.params.id, body, { new: true });
    if (!row) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'goal-progress.patch');
  }
});

router.delete('/:id', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const row = await GoalProgressEntry.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, message: 'تم الحذف' });
  } catch (err) {
    return safeError(res, err, 'goal-progress.delete');
  }
});

router.get('/export.csv', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    const total = await GoalProgressEntry.countDocuments(filter);
    const items = await GoalProgressEntry.find(filter).sort({ recordedAt: 1 }).limit(10_000).lean();
    res.set('X-Total-Count', String(total));
    if (total > 10_000) {
      res.set('X-Truncated', 'true');
      res.set('X-Truncated-At', '10000');
    }
    const ids = [...new Set(items.map(r => String(r.beneficiaryId)).filter(Boolean))];
    const benefs = ids.length
      ? await Beneficiary.find({ _id: { $in: ids } })
          .select('firstName_ar lastName_ar beneficiaryNumber')
          .lean()
      : [];
    const bMap = new Map(benefs.map(b => [String(b._id), b]));
    const esc = v =>
      v == null
        ? ''
        : /[",\n\r]/.test(String(v))
          ? '"' + String(v).replace(/"/g, '""') + '"'
          : String(v);
    const header = [
      'recordedAt',
      'beneficiaryNumber',
      'beneficiaryName',
      'goalId',
      'progressPercent',
      'note',
    ];
    const rows = items.map(r => {
      const b = bMap.get(String(r.beneficiaryId));
      return [
        r.recordedAt?.toISOString()?.slice(0, 10),
        b?.beneficiaryNumber || '',
        b ? [b.firstName_ar, b.lastName_ar].filter(Boolean).join(' ') : '',
        String(r.goalId),
        r.progressPercent,
        r.note || '',
      ]
        .map(esc)
        .join(',');
    });
    const body = '\uFEFF' + header.join(',') + '\n' + rows.join('\n') + '\n';
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set(
      'Content-Disposition',
      `attachment; filename="goal-progress-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(body);
  } catch (err) {
    return safeError(res, err, 'goal-progress.export');
  }
});

module.exports = router;
