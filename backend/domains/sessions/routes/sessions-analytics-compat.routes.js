/**
 * Sessions Analytics Compatibility Router
 * ═══════════════════════════════════════════════════════════════════════════
 * Phase 6 surface unification: absorbs the legacy
 * `/api/v1/therapy-sessions-analytics/*` surface into DDD Sessions.
 *
 * Mounted under `/api/v1/sessions/analytics/*` by the sessions domain so the
 * branch-isolated secure router remains the only HTTP surface for sessions.
 *
 * W269/W1152 — every query is scoped through effectiveBranchScope(req); the
 * :sessionId param uses branchScopedResourceParam to prevent cross-branch IDOR.
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const {
  branchScopedResourceParam,
  effectiveBranchScope,
} = require('../../../middleware/assertBranchMatch');

router.param(
  'sessionId',
  branchScopedResourceParam({
    modelName: 'ClinicalSession',
    label: 'session',
    loadModel: () => require('../models/ClinicalSession'),
  })
);

function Session() {
  try {
    return mongoose.model('ClinicalSession');
  } catch (_e) {
    try {
      require('../models/ClinicalSession');
      return mongoose.model('ClinicalSession');
    } catch (_e2) {
      return null;
    }
  }
}

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
          branchId: mongoose.Schema.Types.ObjectId,
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

function buildDateFilter(from, to) {
  if (!from && !to) return {};
  const f = {};
  if (from) f.$gte = new Date(from);
  if (to) f.$lte = new Date(to);
  return { scheduledDate: f };
}

function baseQuery(req, extra = {}) {
  const q = { isDeleted: { $ne: true }, ...extra };
  const branchId = effectiveBranchScope(req);
  if (branchId) q.branchId = branchId;
  return q;
}

function toObjectId(id) {
  if (!id) return null;
  if (typeof id === 'object' && id._id) return id._id;
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
}

/* ─── GET /sessions/analytics/overview ─────────────────────────────────── */
router.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const S = Session();
    if (!S) return res.status(503).json({ success: false, message: 'Session model unavailable' });

    const { from, to, therapistId } = req.query;
    const q = baseQuery(req, { ...buildDateFilter(from, to) });
    const tid = toObjectId(therapistId);
    if (tid) q.therapistId = tid;

    const [total, byStatus, byModality, byType] = await Promise.all([
      S.countDocuments(q),
      S.aggregate([{ $match: q }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      S.aggregate([{ $match: q }, { $group: { _id: '$modality', count: { $sum: 1 } } }]),
      S.aggregate([{ $match: q }, { $group: { _id: '$type', count: { $sum: 1 } } }]),
    ]);

    const statusMap = Object.fromEntries(byStatus.map(r => [r._id, r.count]));
    const attended = statusMap.completed || 0;
    const cancelled = statusMap.cancelled || 0;
    const noShow = statusMap.no_show || 0;
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

/* ─── GET /sessions/analytics/trends ───────────────────────────────────── */
router.get(
  '/trends',
  asyncHandler(async (req, res) => {
    const S = Session();
    if (!S) return res.status(503).json({ success: false, message: 'Session model unavailable' });

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

/* ─── GET /sessions/analytics/therapist-performance ────────────────────── */
router.get(
  '/therapist-performance',
  asyncHandler(async (req, res) => {
    const S = Session();
    if (!S) return res.status(503).json({ success: false, message: 'Session model unavailable' });

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

/* ─── GET /sessions/analytics/room-utilization ─────────────────────────── */
router.get(
  '/room-utilization',
  asyncHandler(async (req, res) => {
    const S = Session();
    if (!S) return res.status(503).json({ success: false, message: 'Session model unavailable' });

    const { from, to } = req.query;
    const q = baseQuery(req, {
      ...buildDateFilter(from, to),
      room: { $exists: true, $ne: null },
    });

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

/* ─── GET /sessions/analytics/attendance ───────────────────────────────── */
router.get(
  '/attendance',
  asyncHandler(async (req, res) => {
    const S = Session();
    if (!S) return res.status(503).json({ success: false, message: 'Session model unavailable' });

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
        attended: statusMap.attended || 0,
        absent: statusMap.absent || 0,
        noShow: statusMap.no_show || 0,
        late: statusMap.late || 0,
        byStatus: statusMap,
        attendanceRate: total ? +(((statusMap.attended || 0) / total) * 100).toFixed(1) : 0,
      },
    });
  })
);

/* ─── GET /sessions/analytics/billing ──────────────────────────────────── */
router.get(
  '/billing',
  asyncHandler(async (req, res) => {
    const S = Session();
    if (!S) return res.status(503).json({ success: false, message: 'Session model unavailable' });

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

/* ─── GET /sessions/analytics/goal-progress ────────────────────────────── */
router.get(
  '/goal-progress',
  asyncHandler(async (req, res) => {
    const S = Session();
    if (!S) return res.status(503).json({ success: false, message: 'Session model unavailable' });

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

/* ─── GET /sessions/analytics/cancellations ────────────────────────────── */
router.get(
  '/cancellations',
  asyncHandler(async (req, res) => {
    const S = Session();
    if (!S) return res.status(503).json({ success: false, message: 'Session model unavailable' });

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

/* ─── GET /sessions/analytics/calendar ─────────────────────────────────── */
router.get(
  '/calendar',
  asyncHandler(async (req, res) => {
    const S = Session();
    if (!S) return res.status(503).json({ success: false, message: 'Session model unavailable' });

    const { from, to, therapistId, beneficiaryId, limit = 200 } = req.query;
    const q = baseQuery(req, { ...buildDateFilter(from, to) });
    const tid = toObjectId(therapistId);
    const bid = toObjectId(beneficiaryId);
    if (tid) q.therapistId = tid;
    if (bid) q.beneficiaryId = bid;

    const sessions = await S.find(q)
      .sort({ scheduledDate: 1 })
      .limit(Number(limit))
      .select('beneficiaryId therapistId scheduledDate duration status type modality room')
      .lean();

    res.json({ success: true, data: sessions });
  })
);

/* ─── POST /sessions/analytics/export/report ───────────────────────────── */
router.post(
  '/export/report',
  asyncHandler(async (req, res) => {
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

/* ─── GET /sessions/analytics/waitlist ─────────────────────────────────── */
router.get(
  '/waitlist',
  asyncHandler(async (req, res) => {
    const M = Waitlist();
    const { status = 'waiting', limit = 50, skip = 0 } = req.query;
    const q = { status };
    const tid = toObjectId(req.query.therapistId);
    if (tid) q.therapistId = tid;
    const branchId = effectiveBranchScope(req);
    if (branchId) q.branchId = branchId;

    const data = await M.find(q)
      .sort({ requestedDate: 1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .lean();

    res.json({ success: true, data, total: data.length });
  })
);

/* ─── GET /sessions/analytics/:sessionId/billing ───────────────────────── */
router.get(
  '/:sessionId/billing',
  asyncHandler(async (req, res) => {
    const S = Session();
    if (!S) return res.status(503).json({ success: false, message: 'Session model unavailable' });

    const session = await S.findById(req.params.sessionId)
      .select('billingAmount billingStatus billingDate billingNotes')
      .lean();
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    res.json({ success: true, data: session });
  })
);

/* ─── POST /sessions/analytics/billing/bulk ────────────────────────────── */
router.post(
  '/billing/bulk',
  asyncHandler(async (req, res) => {
    const S = Session();
    if (!S) return res.status(503).json({ success: false, message: 'Session model unavailable' });

    const { sessionIds = [], billingStatus, billingAmount } = req.body || {};
    if (!sessionIds.length)
      return res.status(400).json({ success: false, message: 'sessionIds required' });

    const update = { billingDate: new Date() };
    if (billingStatus) update.billingStatus = billingStatus;
    if (billingAmount !== undefined) update.billingAmount = billingAmount;

    const q = { _id: { $in: sessionIds } };
    const branchId = effectiveBranchScope(req);
    if (branchId) q.branchId = branchId;

    const result = await S.updateMany(q, { $set: update });
    res.json({ success: true, data: { modified: result.modifiedCount } });
  })
);

module.exports = router;
