/**
 * therapy-sessions-analytics.routes.js
 * ══════════════════════════════════════════════════════════════════
 * تحليلات الجلسات العلاجية — Therapy Sessions Analytics API
 *
 * Endpoints:
 *   GET  /analytics/overview          — KPIs summary
 *   GET  /analytics/trends            — time-series trends
 *   GET  /analytics/therapist-performance — per-therapist stats
 *   GET  /analytics/room-utilization  — room usage (placeholder)
 *   GET  /analytics/attendance        — attendance breakdown
 *   GET  /analytics/billing           — billing summary
 *   GET  /analytics/goal-progress     — goal achievement stats
 *   GET  /analytics/cancellations     — cancellation analysis
 *   GET  /calendar                    — sessions calendar view
 *   POST /export/report               — trigger PDF/Excel export
 *   GET  /waitlist                    — waitlist queue
 *   GET  /:sessionId/billing          — session billing record
 *   POST /billing/bulk                — bulk billing update
 *
 * Mounted at: /api/v1/therapy-sessions-analytics
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');

// W657 — this analytics router had NO router-level auth; mounts in this repo
// are per-route, so isolation can't be assumed. Authenticate + populate
// req.branchScope so baseQuery(req) can branch-scope every ClinicalSession
// aggregate (ClinicalSession already carries branchId). branchFilter = {} for
// cross-branch/HQ analysts → org-wide analytics preserved.
router.use(authenticateToken, requireBranchAccess);

// ── Lazy model ────────────────────────────────────────────────────────────────
function Session() {
  try {
    return mongoose.model('ClinicalSession');
  } catch (_e) {
    try {
      require('../domains/sessions/models/ClinicalSession');
      return mongoose.model('ClinicalSession');
    } catch (_e2) {
      return null;
    }
  }
}

// Inline waitlist model
function Waitlist() {
  try {
    return mongoose.model('TherapyWaitlist');
  } catch (_e) {
    return mongoose.model(
      'TherapyWaitlist',
      new mongoose.Schema(
        {
          beneficiaryId: mongoose.Schema.Types.ObjectId,
          therapistId: mongoose.Schema.Types.ObjectId,
          requestedDate: Date,
          priority: { type: String, default: 'normal' },
          status: { type: String, default: 'waiting', enum: ['waiting', 'assigned', 'cancelled'] },
          notes: String,
        },
        { timestamps: true }
      )
    );
  }
}

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ── Date range helper ─────────────────────────────────────────────────────────
function buildDateFilter(from, to) {
  if (!from && !to) return {};
  const f = {};
  if (from) f.$gte = new Date(from);
  if (to) f.$lte = new Date(to);
  return { scheduledDate: f };
}

function baseQuery(req, extra = {}) {
  // W657 — branch-scope every analytics query at the single shared helper.
  return { isDeleted: { $ne: true }, ...branchFilter(req), ...extra };
}

/* ══════════════════════ ANALYTICS OVERVIEW ════════════════════════════════ */

router.get(
  '/analytics/overview',
  asyncHandler(async (req, res) => {
    const S = Session();
    if (!S) return res.json({ success: true, data: {} });
    const { from, to, therapistId } = req.query;
    const q = baseQuery(req, { ...buildDateFilter(from, to) });
    if (therapistId) q.therapistId = new mongoose.Types.ObjectId(therapistId);

    const [total, byStatus, byModality, byType] = await Promise.all([
      S.countDocuments(q),
      S.aggregate([{ $match: q }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      S.aggregate([{ $match: q }, { $group: { _id: '$modality', count: { $sum: 1 } } }]),
      S.aggregate([{ $match: q }, { $group: { _id: '$type', count: { $sum: 1 } } }]),
    ]);

    const statusMap = Object.fromEntries(byStatus.map(r => [r._id, r.count]));
    const attended = statusMap['completed'] || 0;
    const cancelled = statusMap['cancelled'] || 0;
    const noShow = statusMap['no_show'] || 0;
    const attendanceRate = total ? +((attended / total) * 100).toFixed(1) : 0;
    const cancellationRate = total ? +((cancelled / total) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        totalSessions: total,
        attendanceRate,
        cancellationRate,
        noShowRate: total ? +((noShow / total) * 100).toFixed(1) : 0,
        byStatus: statusMap,
        byModality: Object.fromEntries(byModality.map(r => [r._id, r.count])),
        byType: Object.fromEntries(byType.map(r => [r._id, r.count])),
      },
    });
  })
);

/* ══════════════════════ TRENDS ════════════════════════════════════════════ */

router.get(
  '/analytics/trends',
  asyncHandler(async (req, res) => {
    const S = Session();
    if (!S) return res.json({ success: true, data: [] });
    const { from, to, granularity = 'day' } = req.query;
    const q = baseQuery(req, { ...buildDateFilter(from, to) });

    const groupId = {
      day: {
        year: { $year: '$scheduledDate' },
        month: { $month: '$scheduledDate' },
        day: { $dayOfMonth: '$scheduledDate' },
      },
      week: { year: { $year: '$scheduledDate' }, week: { $week: '$scheduledDate' } },
      month: { year: { $year: '$scheduledDate' }, month: { $month: '$scheduledDate' } },
    }[granularity] || {
      year: { $year: '$scheduledDate' },
      month: { $month: '$scheduledDate' },
      day: { $dayOfMonth: '$scheduledDate' },
    };

    const trend = await S.aggregate([
      { $match: q },
      {
        $group: {
          _id: groupId,
          count: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    res.json({ success: true, data: trend });
  })
);

/* ══════════════════════ THERAPIST PERFORMANCE ══════════════════════════════ */

router.get(
  '/analytics/therapist-performance',
  asyncHandler(async (req, res) => {
    const S = Session();
    if (!S) return res.json({ success: true, data: [] });
    const { from, to } = req.query;
    const q = baseQuery(req, { ...buildDateFilter(from, to) });

    const stats = await S.aggregate([
      { $match: q },
      {
        $group: {
          _id: '$therapistId',
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          noShow: { $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] } },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 20 },
    ]);

    res.json({ success: true, data: stats });
  })
);

/* ══════════════════════ ROOM UTILIZATION ═══════════════════════════════════ */

router.get(
  '/analytics/room-utilization',
  asyncHandler(async (req, res) => {
    const S = Session();
    if (!S) return res.json({ success: true, data: [] });
    const { from, to } = req.query;
    const q = baseQuery(req, { ...buildDateFilter(from, to), room: { $exists: true, $ne: null } });

    const utilization = await S.aggregate([
      { $match: q },
      {
        $group: {
          _id: '$room',
          totalBookings: { $sum: 1 },
          totalDuration: { $sum: { $ifNull: ['$duration', 0] } },
        },
      },
      { $sort: { totalBookings: -1 } },
    ]);

    res.json({ success: true, data: utilization });
  })
);

/* ══════════════════════ ATTENDANCE ═════════════════════════════════════════ */

router.get(
  '/analytics/attendance',
  asyncHandler(async (req, res) => {
    const S = Session();
    if (!S) return res.json({ success: true, data: {} });
    const { from, to } = req.query;
    const q = baseQuery(req, { ...buildDateFilter(from, to) });

    const byStatus = await S.aggregate([
      { $match: q },
      { $group: { _id: '$attendanceStatus', count: { $sum: 1 } } },
    ]);

    const total = await S.countDocuments(q);
    const statusMap = Object.fromEntries(byStatus.map(r => [r._id || 'unknown', r.count]));

    res.json({
      success: true,
      data: {
        total,
        attended: statusMap['attended'] || 0,
        absent: statusMap['absent'] || 0,
        noShow: statusMap['no_show'] || 0,
        late: statusMap['late'] || 0,
        byStatus: statusMap,
        attendanceRate: total ? +(((statusMap['attended'] || 0) / total) * 100).toFixed(1) : 0,
      },
    });
  })
);

/* ══════════════════════ BILLING SUMMARY ════════════════════════════════════ */

router.get(
  '/analytics/billing',
  asyncHandler(async (req, res) => {
    const S = Session();
    if (!S) return res.json({ success: true, data: {} });
    const { from, to } = req.query;
    const q = baseQuery(req, { ...buildDateFilter(from, to) });

    const billing = await S.aggregate([
      { $match: q },
      {
        $group: {
          _id: '$billingStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: { $ifNull: ['$billingAmount', 0] } },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        summary: Object.fromEntries(
          billing.map(r => [r._id || 'unbilled', { count: r.count, amount: r.totalAmount }])
        ),
      },
    });
  })
);

/* ══════════════════════ GOAL PROGRESS ══════════════════════════════════════ */

router.get(
  '/analytics/goal-progress',
  asyncHandler(async (req, res) => {
    const S = Session();
    if (!S) return res.json({ success: true, data: {} });
    const { from, to } = req.query;
    const q = baseQuery(req, {
      ...buildDateFilter(from, to),
      status: 'completed',
      'goalProgress.0': { $exists: true },
    });

    const stats = await S.aggregate([
      { $match: q },
      { $unwind: '$goalProgress' },
      {
        $group: {
          _id: '$goalProgress.status',
          count: { $sum: 1 },
          avgProgress: { $avg: '$goalProgress.progressPercentage' },
        },
      },
    ]);

    res.json({ success: true, data: { byStatus: stats } });
  })
);

/* ══════════════════════ CANCELLATIONS ══════════════════════════════════════ */

router.get(
  '/analytics/cancellations',
  asyncHandler(async (req, res) => {
    const S = Session();
    if (!S) return res.json({ success: true, data: {} });
    const { from, to } = req.query;
    const q = baseQuery(req, {
      ...buildDateFilter(from, to),
      status: { $in: ['cancelled', 'no_show'] },
    });

    const [byReason, total] = await Promise.all([
      S.aggregate([
        { $match: q },
        { $group: { _id: '$cancellation.reason', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 15 },
      ]),
      S.countDocuments(q),
    ]);

    res.json({ success: true, data: { total, byReason } });
  })
);

/* ══════════════════════ CALENDAR ═══════════════════════════════════════════ */

router.get(
  '/calendar',
  asyncHandler(async (req, res) => {
    const S = Session();
    if (!S) return res.json({ success: true, data: [] });
    const { from, to, therapistId, beneficiaryId, limit = 200 } = req.query;
    const q = baseQuery(req, { ...buildDateFilter(from, to) });
    if (therapistId) q.therapistId = new mongoose.Types.ObjectId(therapistId);
    if (beneficiaryId) q.beneficiaryId = new mongoose.Types.ObjectId(beneficiaryId);

    const sessions = await S.find(q)
      .sort({ scheduledDate: 1 })
      .limit(Number(limit))
      .select('beneficiaryId therapistId scheduledDate duration status type modality room')
      .lean();

    res.json({ success: true, data: sessions });
  })
);

/* ══════════════════════ EXPORT ═════════════════════════════════════════════ */

router.post(
  '/export/report',
  asyncHandler(async (req, res) => {
    // Placeholder — returns a download token or triggers async export
    const jobId = new mongoose.Types.ObjectId().toHexString();
    res.json({
      success: true,
      data: {
        jobId,
        status: 'queued',
        message: 'Export job queued. Check /reports/export/:jobId for status.',
      },
    });
  })
);

/* ══════════════════════ WAITLIST ════════════════════════════════════════════ */

router.get(
  '/waitlist',
  asyncHandler(async (req, res) => {
    const M = Waitlist();
    const { status = 'waiting', limit = 50, skip = 0 } = req.query;
    const q = { status };
    if (req.query.therapistId) q.therapistId = new mongoose.Types.ObjectId(req.query.therapistId);
    const data = await M.find(q)
      .sort({ requestedDate: 1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .lean();
    res.json({ success: true, data, total: data.length });
  })
);

/* ══════════════════════ SESSION BILLING ════════════════════════════════════ */

router.get(
  '/:sessionId/billing',
  asyncHandler(async (req, res) => {
    const S = Session();
    if (!S) return res.json({ success: true, data: null });
    const session = await S.findById(req.params.sessionId)
      .select('billingAmount billingStatus billingDate billingNotes')
      .lean();
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    res.json({ success: true, data: session });
  })
);

router.post(
  '/billing/bulk',
  asyncHandler(async (req, res) => {
    const S = Session();
    if (!S) return res.status(503).json({ success: false, message: 'Session model unavailable' });
    const { sessionIds = [], billingStatus, billingAmount } = req.body || {};
    if (!sessionIds.length)
      return res.status(400).json({ success: false, message: 'sessionIds required' });

    const update = {};
    if (billingStatus) update.billingStatus = billingStatus;
    if (billingAmount !== undefined) update.billingAmount = billingAmount;
    update.billingDate = new Date();

    const result = await S.updateMany({ _id: { $in: sessionIds } }, { $set: update });
    res.json({ success: true, data: { modified: result.modifiedCount } });
  })
);

module.exports = router;
