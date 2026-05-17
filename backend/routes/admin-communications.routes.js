'use strict';
/**
 * Admin Communications Routes — لوحة إدارة التواصل للمشرفين
 * ══════════════════════════════════════════════════════════════════════════
 * Admin-level overview of all communication channels, assignment management,
 * escalation handling, staff performance in communications.
 *
 *   GET    /overview          dashboard: all channels summary
 *   GET    /queue             pending/unassigned communications
 *   PATCH  /queue/:id/assign  assign communication to staff member
 *   PATCH  /queue/:id/escalate escalate to supervisor
 *   PATCH  /queue/:id/close   close communication
 *   GET    /staff-metrics     per-staff response metrics
 *   GET    /sla-breaches      SLA breach report
 *   POST   /bulk-action       bulk assign/close/escalate
 *   GET    /audit-log         communication audit log
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

// ── GET /overview ──────────────────────────────────────────────────────────
router.get('/overview', async (req, res) => {
  try {
    const Communication = safeModel('Communication');
    if (!Communication)
      return res.json({
        success: true,
        data: { channels: {}, totals: { open: 0, resolved: 0, pending: 0 } },
      });
    const base = { branchId: req.user.branchId };
    const [byChannel, open, resolved, pending] = await Promise.all([
      Communication.aggregate([
        { $match: base },
        {
          $group: {
            _id: '$channel',
            total: { $sum: 1 },
            open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
            resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          },
        },
      ]),
      Communication.countDocuments({ ...base, status: 'open' }),
      Communication.countDocuments({ ...base, status: 'resolved' }),
      Communication.countDocuments({ ...base, status: 'pending' }),
    ]);
    res.json({
      success: true,
      data: {
        channels: Object.fromEntries(
          byChannel.map(c => [c._id, { total: c.total, open: c.open, resolved: c.resolved }])
        ),
        totals: { open, resolved, pending },
      },
    });
  } catch (err) {
    safeError(res, err, 'communications overview');
  }
});

// ── GET /queue ─────────────────────────────────────────────────────────────
router.get('/queue', async (req, res) => {
  try {
    const Communication = safeModel('Communication');
    if (!Communication) return res.json({ success: true, data: [] });
    const { page = 1, limit = 20, channel, priority } = req.query;
    const filter = {
      branchId: req.user.branchId,
      status: { $in: ['open', 'pending'] },
      assignedTo: { $exists: false },
    };
    if (channel) filter.channel = channel;
    if (priority) filter.priority = priority;
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      Communication.find(filter)
        .sort({ priority: -1, createdAt: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Communication.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    safeError(res, err, 'communications queue');
  }
});

// ── PATCH /queue/:id/assign ────────────────────────────────────────────────
router.patch('/queue/:id/assign', async (req, res) => {
  try {
    const { assignedTo } = req.body;
    if (!assignedTo)
      return res.status(400).json({ success: false, message: 'assignedTo is required' });
    const Communication = safeModel('Communication');
    if (!Communication)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Communication.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId },
      { assignedTo, assignedAt: new Date(), assignedBy: req.user._id, status: 'in_progress' },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Communication not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'assign communication');
  }
});

// ── PATCH /queue/:id/escalate ──────────────────────────────────────────────
router.patch('/queue/:id/escalate', async (req, res) => {
  try {
    const { escalateTo, reason } = req.body;
    const Communication = safeModel('Communication');
    if (!Communication)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Communication.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId },
      {
        isEscalated: true,
        escalatedTo: escalateTo,
        escalationReason: reason,
        escalatedAt: new Date(),
        escalatedBy: req.user._id,
        priority: 'urgent',
      },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Communication not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'escalate communication');
  }
});

// ── PATCH /queue/:id/close ─────────────────────────────────────────────────
router.patch('/queue/:id/close', async (req, res) => {
  try {
    const { resolution } = req.body;
    const Communication = safeModel('Communication');
    if (!Communication)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Communication.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId },
      { status: 'resolved', resolution, resolvedAt: new Date(), resolvedBy: req.user._id },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Communication not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'close communication');
  }
});

// ── GET /staff-metrics ─────────────────────────────────────────────────────
router.get('/staff-metrics', async (req, res) => {
  try {
    const Communication = safeModel('Communication');
    if (!Communication) return res.json({ success: true, data: [] });
    const metrics = await Communication.aggregate([
      { $match: { branchId: req.user.branchId, assignedTo: { $exists: true } } },
      {
        $group: {
          _id: '$assignedTo',
          handled: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        },
      },
    ]);
    res.json({ success: true, data: metrics });
  } catch (err) {
    safeError(res, err, 'staff metrics');
  }
});

// ── GET /sla-breaches ──────────────────────────────────────────────────────
router.get('/sla-breaches', async (req, res) => {
  try {
    const Communication = safeModel('Communication');
    if (!Communication) return res.json({ success: true, data: [], total: 0 });
    const slaThresholdMs = 4 * 60 * 60 * 1000; // 4 hours
    const data = await Communication.find({
      branchId: req.user.branchId,
      status: 'open',
      createdAt: { $lt: new Date(Date.now() - slaThresholdMs) },
    })
      .sort({ createdAt: 1 })
      .lean();
    res.json({ success: true, data, total: data.length });
  } catch (err) {
    safeError(res, err, 'sla breaches');
  }
});

// ── POST /bulk-action ──────────────────────────────────────────────────────
router.post('/bulk-action', async (req, res) => {
  try {
    const { ids = [], action, assignedTo, resolution } = req.body;
    if (!ids.length || !action)
      return res.status(400).json({ success: false, message: 'ids and action are required' });
    const Communication = safeModel('Communication');
    if (!Communication)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    let update = {};
    if (action === 'assign') {
      update = {
        assignedTo,
        assignedAt: new Date(),
        assignedBy: req.user._id,
        status: 'in_progress',
      };
    } else if (action === 'close') {
      update = { status: 'resolved', resolution, resolvedAt: new Date(), resolvedBy: req.user._id };
    } else if (action === 'escalate') {
      update = { isEscalated: true, priority: 'urgent' };
    } else return res.status(400).json({ success: false, message: 'Invalid action' });
    const result = await Communication.updateMany(
      { _id: { $in: ids }, branchId: req.user.branchId },
      update
    );
    res.json({ success: true, data: { modifiedCount: result.modifiedCount } });
  } catch (err) {
    safeError(res, err, 'bulk action');
  }
});

// ── GET /audit-log ─────────────────────────────────────────────────────────
router.get('/audit-log', async (req, res) => {
  try {
    const Communication = safeModel('Communication');
    if (!Communication) return res.json({ success: true, data: [] });
    const { page = 1, limit = 50, startDate, endDate } = req.query;
    const filter = { branchId: req.user.branchId };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    const skip = (Number(page) - 1) * Number(limit);
    const data = await Communication.find(filter)
      .select('channel status assignedTo assignedBy resolvedBy createdAt updatedAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'audit log');
  }
});

module.exports = router;
