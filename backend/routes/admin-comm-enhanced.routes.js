'use strict';
/**
 * Admin Communications Enhanced Routes — تحليلات التواصل المتقدمة
 * ══════════════════════════════════════════════════════════════════════════
 * Deep analytics for communication quality, agent performance, trend
 * analysis, and advanced SLA reporting beyond the basic admin view.
 *
 *   GET    /quality-scores      communication quality score per channel
 *   GET    /agent-performance   detailed per-agent performance metrics
 *   GET    /response-time-heatmap hourly/daily response time heatmap
 *   GET    /volume-trends       message volume over time
 *   GET    /sentiment-analysis  aggregated sentiment breakdown
 *   GET    /sla-report          advanced SLA compliance report
 *   GET    /channel-comparison  channel effectiveness comparison
 *   POST   /export              export analytics data (CSV-ready)
 */

const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac.v2.middleware');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');

const router = express.Router();
router.use(authenticate);
router.use(requireBranchAccess);
router.use(requireRole('admin', 'manager', 'supervisor'));

const safeModel = name => {
  try {
    return mongoose.model(name);
  } catch (_) {
    return null;
  }
};

// Helper: date range filter from query params
function dateRangeFilter(query) {
  const filter = {};
  const { startDate, endDate } = query;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }
  return filter;
}

// ── GET /quality-scores ────────────────────────────────────────────────────
router.get('/quality-scores', async (req, res) => {
  try {
    const Communication = safeModel('Communication');
    if (!Communication) return res.json({ success: true, data: [] });
    const base = { branchId: req.user.branchId, ...dateRangeFilter(req.query) };
    const scores = await Communication.aggregate([
      { $match: base },
      {
        $group: {
          _id: '$channel',
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          escalated: { $sum: { $cond: ['$isEscalated', 1, 0] } },
          avgRating: { $avg: '$customerRating' },
        },
      },
      {
        $addFields: {
          resolutionRate: { $multiply: [{ $divide: ['$resolved', '$total'] }, 100] },
          escalationRate: { $multiply: [{ $divide: ['$escalated', '$total'] }, 100] },
        },
      },
    ]);
    res.json({ success: true, data: scores });
  } catch (err) {
    safeError(res, err, 'quality scores');
  }
});

// ── GET /agent-performance ─────────────────────────────────────────────────
router.get('/agent-performance', async (req, res) => {
  try {
    const Communication = safeModel('Communication');
    if (!Communication) return res.json({ success: true, data: [] });
    const base = {
      branchId: req.user.branchId,
      assignedTo: { $exists: true, $ne: null },
      ...dateRangeFilter(req.query),
    };
    const perf = await Communication.aggregate([
      { $match: base },
      {
        $group: {
          _id: '$assignedTo',
          totalHandled: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          escalated: { $sum: { $cond: ['$isEscalated', 1, 0] } },
          avgCustomerRating: { $avg: '$customerRating' },
        },
      },
      {
        $addFields: {
          resolutionRate: { $multiply: [{ $divide: ['$resolved', '$totalHandled'] }, 100] },
        },
      },
      { $sort: { resolutionRate: -1 } },
    ]);
    res.json({ success: true, data: perf });
  } catch (err) {
    safeError(res, err, 'agent performance');
  }
});

// ── GET /response-time-heatmap ─────────────────────────────────────────────
router.get('/response-time-heatmap', async (req, res) => {
  try {
    const Communication = safeModel('Communication');
    if (!Communication) return res.json({ success: true, data: [] });
    const base = {
      branchId: req.user.branchId,
      firstResponseAt: { $exists: true },
      ...dateRangeFilter(req.query),
    };
    const heatmap = await Communication.aggregate([
      { $match: base },
      {
        $addFields: {
          hour: { $hour: '$createdAt' },
          dayOfWeek: { $dayOfWeek: '$createdAt' },
          responseTimeMin: { $divide: [{ $subtract: ['$firstResponseAt', '$createdAt'] }, 60000] },
        },
      },
      {
        $group: {
          _id: { hour: '$hour', day: '$dayOfWeek' },
          avgResponseTime: { $avg: '$responseTimeMin' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.day': 1, '_id.hour': 1 } },
    ]);
    res.json({ success: true, data: heatmap });
  } catch (err) {
    safeError(res, err, 'response time heatmap');
  }
});

// ── GET /volume-trends ─────────────────────────────────────────────────────
router.get('/volume-trends', async (req, res) => {
  try {
    const Communication = safeModel('Communication');
    if (!Communication) return res.json({ success: true, data: [] });
    const { groupBy = 'day' } = req.query;
    const base = { branchId: req.user.branchId, ...dateRangeFilter(req.query) };
    const dateGroup =
      groupBy === 'hour'
        ? {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
            hour: { $hour: '$createdAt' },
          }
        : {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          };
    const trends = await Communication.aggregate([
      { $match: base },
      { $group: { _id: { date: dateGroup, channel: '$channel' }, count: { $sum: 1 } } },
      { $sort: { '_id.date.year': 1, '_id.date.month': 1, '_id.date.day': 1 } },
    ]);
    res.json({ success: true, data: trends });
  } catch (err) {
    safeError(res, err, 'volume trends');
  }
});

// ── GET /sentiment-analysis ────────────────────────────────────────────────
router.get('/sentiment-analysis', async (req, res) => {
  try {
    const Communication = safeModel('Communication');
    if (!Communication)
      return res.json({
        success: true,
        data: { positive: 0, neutral: 0, negative: 0, byChannel: [] },
      });
    const base = {
      branchId: req.user.branchId,
      sentiment: { $exists: true },
      ...dateRangeFilter(req.query),
    };
    const [overall, byChannel] = await Promise.all([
      Communication.aggregate([
        { $match: base },
        { $group: { _id: '$sentiment', count: { $sum: 1 } } },
      ]),
      Communication.aggregate([
        { $match: base },
        { $group: { _id: { channel: '$channel', sentiment: '$sentiment' }, count: { $sum: 1 } } },
      ]),
    ]);
    const sentimentMap = Object.fromEntries(overall.map(o => [o._id, o.count]));
    res.json({
      success: true,
      data: {
        positive: sentimentMap.positive || 0,
        neutral: sentimentMap.neutral || 0,
        negative: sentimentMap.negative || 0,
        byChannel,
      },
    });
  } catch (err) {
    safeError(res, err, 'sentiment analysis');
  }
});

// ── GET /sla-report ────────────────────────────────────────────────────────
router.get('/sla-report', async (req, res) => {
  try {
    const Communication = safeModel('Communication');
    if (!Communication)
      return res.json({
        success: true,
        data: { compliance: 100, breaches: 0, avgBreachDurationHours: 0 },
      });
    const slaThresholdMs = 4 * 60 * 60 * 1000;
    const base = { branchId: req.user.branchId, ...dateRangeFilter(req.query) };
    const [total, within, breached] = await Promise.all([
      Communication.countDocuments({ ...base, status: { $in: ['resolved', 'open'] } }),
      Communication.countDocuments({
        ...base,
        status: 'resolved',
        $expr: { $lte: [{ $subtract: ['$resolvedAt', '$createdAt'] }, slaThresholdMs] },
      }),
      Communication.countDocuments({
        ...base,
        status: 'open',
        createdAt: { $lt: new Date(Date.now() - slaThresholdMs) },
      }),
    ]);
    const compliance = total > 0 ? ((within / total) * 100).toFixed(1) : 100;
    res.json({
      success: true,
      data: { total, withinSla: within, breached, compliancePercent: parseFloat(compliance) },
    });
  } catch (err) {
    safeError(res, err, 'sla report');
  }
});

// ── GET /channel-comparison ────────────────────────────────────────────────
router.get('/channel-comparison', async (req, res) => {
  try {
    const Communication = safeModel('Communication');
    if (!Communication) return res.json({ success: true, data: [] });
    const base = { branchId: req.user.branchId, ...dateRangeFilter(req.query) };
    const comparison = await Communication.aggregate([
      { $match: base },
      {
        $group: {
          _id: '$channel',
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          escalated: { $sum: { $cond: ['$isEscalated', 1, 0] } },
          avgRating: { $avg: '$customerRating' },
        },
      },
      {
        $addFields: {
          resolutionRate: {
            $multiply: [{ $divide: ['$resolved', { $ifNull: ['$total', 1] }] }, 100],
          },
        },
      },
    ]);
    res.json({ success: true, data: comparison });
  } catch (err) {
    safeError(res, err, 'channel comparison');
  }
});

// ── POST /export ───────────────────────────────────────────────────────────
router.post('/export', async (req, res) => {
  try {
    const Communication = safeModel('Communication');
    if (!Communication)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const {
      fields = ['channel', 'status', 'createdAt', 'resolvedAt', 'assignedTo'],
      ...queryFilters
    } = req.body;
    const base = { branchId: req.user.branchId, ...dateRangeFilter(queryFilters) };
    const select = fields.join(' ');
    const data = await Communication.find(base).select(select).limit(5000).lean();
    res.json({
      success: true,
      data,
      count: data.length,
      exportedAt: new Date(),
      format: 'json',
      note: 'Pipe to CSV formatter on client side',
    });
  } catch (err) {
    safeError(res, err, 'export analytics');
  }
});

module.exports = router;
