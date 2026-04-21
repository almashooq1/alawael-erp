/**
 * onboarding-admin.routes.js — new-hire onboarding analytics + progress.
 *
 * Mount at /api/admin/onboarding.
 *
 * The OnboardingChecklist model had no routes before this — HR was
 * tracking onboardings in Mongo with no way to query them from the
 * UI. This surface fills that gap.
 *
 * Endpoints:
 *   GET    /                  paginated list + filters
 *   GET    /overview          summary + overdue-alarm + thresholds
 *   GET    /by-status         status breakdown
 *   GET    /task-completion   per-task completion rate (bottlenecks)
 *   GET    /by-responsible    completion rate per owner (HR/IT/manager/etc)
 *   GET    /stalled           past-target list, sorted by days-late
 *   GET    /trend             monthly started + completed
 *   PATCH  /:id               update a checklist (status / tasks / buddy)
 *   PATCH  /:id/tasks/:taskIdx mark task complete / in_progress
 *   GET    /export.csv        stalled-checklist CSV (admin only)
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const OnboardingChecklist = require('../models/OnboardingChecklist');
const oa = require('../services/onboardingAnalyticsService');
const safeError = require('../utils/safeError');

router.use(authenticateToken);

const READ_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'hr', 'hr_manager', 'it'];
const WRITE_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'hr', 'hr_manager'];
const ADMIN_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'hr', 'hr_manager'];

function buildFilter(q) {
  const f = {};
  if (q.status && ['pending', 'in_progress', 'completed'].includes(q.status)) f.status = q.status;
  if (q.branchId && mongoose.isValidObjectId(q.branchId)) f.branchId = q.branchId;
  return f;
}

router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [items, total] = await Promise.all([
      OnboardingChecklist.find(filter)
        .sort({ startDate: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      OnboardingChecklist.countDocuments(filter),
    ]);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'onboarding.list');
  }
});

router.get('/overview', requireRole(READ_ROLES), async (req, res) => {
  try {
    const all = await OnboardingChecklist.find({}).lean();
    res.json({
      success: true,
      summary: oa.summarize(all),
      alarm: oa.detectOverdueAlarm(all),
      thresholds: {
        overdueAlarmCount: oa.THRESHOLDS.overdueAlarmCount,
        graceDays: oa.THRESHOLDS.graceDays,
      },
    });
  } catch (err) {
    return safeError(res, err, 'onboarding.overview');
  }
});

router.get('/by-status', requireRole(READ_ROLES), async (req, res) => {
  try {
    const all = await OnboardingChecklist.find({}).select('status').lean();
    res.json({ success: true, items: oa.byStatus(all) });
  } catch (err) {
    return safeError(res, err, 'onboarding.byStatus');
  }
});

router.get('/task-completion', requireRole(READ_ROLES), async (req, res) => {
  try {
    const all = await OnboardingChecklist.find({}).select('tasks').lean();
    res.json({ success: true, items: oa.taskCompletion(all) });
  } catch (err) {
    return safeError(res, err, 'onboarding.taskCompletion');
  }
});

router.get('/by-responsible', requireRole(READ_ROLES), async (req, res) => {
  try {
    const all = await OnboardingChecklist.find({}).select('tasks').lean();
    res.json({ success: true, items: oa.byResponsible(all) });
  } catch (err) {
    return safeError(res, err, 'onboarding.byResponsible');
  }
});

router.get('/stalled', requireRole(READ_ROLES), async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const open = await OnboardingChecklist.find({
      status: { $in: ['pending', 'in_progress'] },
    }).lean();
    res.json({ success: true, items: oa.stalledChecklists(open, new Date(), limit) });
  } catch (err) {
    return safeError(res, err, 'onboarding.stalled');
  }
});

router.get('/trend', requireRole(READ_ROLES), async (req, res) => {
  try {
    const months = Math.min(24, Math.max(1, parseInt(req.query.months, 10) || 12));
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const all = await OnboardingChecklist.find({
      $or: [{ startDate: { $gte: cutoff } }, { actualCompletionDate: { $gte: cutoff } }],
    })
      .select('startDate actualCompletionDate status')
      .lean();
    res.json({ success: true, months: oa.monthlyTrend(all) });
  } catch (err) {
    return safeError(res, err, 'onboarding.trend');
  }
});

router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const patch = { ...(req.body || {}), updatedBy: req.user?.id };
    if (patch.status === 'completed' && !patch.actualCompletionDate) {
      patch.actualCompletionDate = new Date();
    }
    const row = await OnboardingChecklist.findByIdAndUpdate(req.params.id, patch, { new: true });
    if (!row) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'onboarding.patch');
  }
});

router.patch('/:id/tasks/:taskIdx', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const idx = parseInt(req.params.taskIdx, 10);
    if (!Number.isFinite(idx) || idx < 0)
      return res.status(400).json({ success: false, message: 'فهرس المهمة غير صالح' });
    const { status, notes } = req.body || {};
    if (status && !['pending', 'in_progress', 'completed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'حالة غير صالحة' });
    }
    const row = await OnboardingChecklist.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'غير موجود' });
    if (!row.tasks || idx >= row.tasks.length) {
      return res.status(404).json({ success: false, message: 'المهمة غير موجودة' });
    }
    if (status) row.tasks[idx].status = status;
    if (status === 'completed' && !row.tasks[idx].completedAt) {
      row.tasks[idx].completedAt = new Date();
    }
    if (typeof notes === 'string') row.tasks[idx].notes = notes;
    // Recompute completion percentage.
    const done = row.tasks.filter(t => t.status === 'completed').length;
    row.completionPercentage = row.tasks.length ? Math.round((done / row.tasks.length) * 100) : 0;
    if (row.completionPercentage === 100 && row.status !== 'completed') {
      row.status = 'completed';
      row.actualCompletionDate = new Date();
    }
    row.updatedBy = req.user?.id;
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'onboarding.patchTask');
  }
});

router.get('/export.csv', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const open = await OnboardingChecklist.find({
      status: { $in: ['pending', 'in_progress'] },
    }).lean();
    const items = oa.stalledChecklists(open, new Date(), 10_000);
    res.set('X-Total-Count', String(items.length));
    const esc = v =>
      v == null
        ? ''
        : /[",\n\r]/.test(String(v))
          ? '"' + String(v).replace(/"/g, '""') + '"'
          : String(v);
    const header = [
      'uuid',
      'startDate',
      'targetCompletionDate',
      'daysLate',
      'status',
      'completionPercentage',
      'completedTasks',
      'totalTasks',
    ];
    const rows = items.map(r =>
      [
        r.uuid || '',
        r.startDate ? new Date(r.startDate).toISOString().slice(0, 10) : '',
        r.targetCompletionDate ? new Date(r.targetCompletionDate).toISOString().slice(0, 10) : '',
        r.daysLate,
        r.status,
        r.completionPercentage,
        r.completedTasks,
        r.totalTasks,
      ]
        .map(esc)
        .join(',')
    );
    const body = '\uFEFF' + header.join(',') + '\n' + rows.join('\n') + '\n';
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set(
      'Content-Disposition',
      `attachment; filename="onboarding-stalled-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(body);
  } catch (err) {
    return safeError(res, err, 'onboarding.export');
  }
});

module.exports = router;
