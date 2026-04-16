/**
 * Portal Notifications Routes — مسارات تنبيهات البوابة
 * CRUD + read/unread + archive + stats for guardian/beneficiary notifications
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const PortalNotification = require('../models/PortalNotification');
const { requireAuth, _requireRole } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const logger = require('../utils/logger');
const { safeError } = require('../utils/safeError');
const { stripUpdateMeta } = require('../utils/sanitize');

// ── Helpers ────────────────────────────────────────────────────────────
const toId = v => {
  try {
    return new mongoose.Types.ObjectId(v);
  } catch {
    return null;
  }
};

// ── GET / — list notifications (filter by guardian, beneficiary, type, priority, status, read) ──
router.get('/', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const {
      guardianId,
      beneficiaryId,
      type,
      priority,
      status,
      isRead,
      isArchived,
      page = 1,
      limit = 25,
    } = req.query;

    const filter = { ...branchFilter(req) };
    if (guardianId) filter.guardianId = guardianId;
    if (beneficiaryId) filter.beneficiaryId = beneficiaryId;
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (status) filter.status = status;
    if (isRead !== undefined) filter.isRead = isRead === 'true';
    if (isArchived !== undefined) filter.isArchived = isArchived === 'true';
    else filter.isArchived = false; // default: exclude archived

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      PortalNotification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('guardianId', 'name phone')
        .populate('beneficiaryId', 'name')
        .populate('sentBy', 'name')
        .lean(),
      PortalNotification.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    safeError(res, err, 'PortalNotifications GET / error');
  }
});

// ── GET /stats — notification statistics for a guardian ─────────────────
router.get('/stats', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const { guardianId } = req.query;
    if (!guardianId) {
      return res.status(400).json({ success: false, message: 'guardianId is required' });
    }

    const gId = toId(guardianId);
    const stats = await PortalNotification.aggregate([
      { $match: { guardianId: gId, isArchived: false, ...branchFilter(req) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unread: { $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] } },
          urgent: {
            $sum: { $cond: [{ $in: ['$priority', ['urgent', 'high']] }, 1, 0] },
          },
          read: { $sum: { $cond: [{ $eq: ['$isRead', true] }, 1, 0] } },
        },
      },
    ]);

    const byType = await PortalNotification.aggregate([
      { $match: { guardianId: gId, isArchived: false, ...branchFilter(req) } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      data: {
        ...(stats[0] || { total: 0, unread: 0, urgent: 0, read: 0 }),
        byType,
      },
    });
  } catch (err) {
    safeError(res, err, 'PortalNotifications GET /stats error');
  }
});

// ── GET /guardian/:guardianId — shortcut: all notifications for guardian ──
router.get('/guardian/:guardianId', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const data = await PortalNotification.getForGuardian(req.params.guardianId, Number(limit));
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    safeError(res, err, 'PortalNotifications GET /guardian/:id error');
  }
});

// ── GET /guardian/:guardianId/unread — unread notifications ─────────────
router.get('/guardian/:guardianId/unread', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const data = await PortalNotification.getUnreadForGuardian(req.params.guardianId);
    const count = await PortalNotification.getUnreadCountForGuardian(req.params.guardianId);
    res.json({ success: true, data, count });
  } catch (err) {
    safeError(res, err, 'PortalNotifications GET /guardian/:id/unread error');
  }
});

// ── GET /guardian/:guardianId/urgent — urgent unread ────────────────────
router.get('/guardian/:guardianId/urgent', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const data = await PortalNotification.getUrgentNotifications(req.params.guardianId);
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    safeError(res, err, 'PortalNotifications GET /guardian/:id/urgent error');
  }
});

// ── GET /:id — single notification ─────────────────────────────────────
router.get('/:id', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const doc = await PortalNotification.findOne({ _id: req.params.id, ...branchFilter(req) })
      .populate('guardianId', 'name phone')
      .populate('beneficiaryId', 'name')
      .populate('sentBy', 'name');
    if (!doc) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'PortalNotifications GET /:id error');
  }
});

// ── POST / — create notification ───────────────────────────────────────
router.post('/', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const body = { ...req.body };
    if (req.branchScope && req.branchScope.branchId) {
      body.branchId = req.branchScope.branchId;
    }
    const doc = await PortalNotification.create({
      ...body,
      sentBy: req.body.sentBy || req.user?._id,
      sentAt: new Date(),
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    logger.error('PortalNotifications POST / error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

// ── POST /send — create + send helper (uses model static) ─────────────
router.post('/send', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const {
      guardianId,
      beneficiaryId,
      type,
      title_ar,
      title_en,
      message_ar,
      message_en,
      relatedType,
      relatedId,
    } = req.body;

    const doc = await PortalNotification.createAndSend(
      guardianId,
      beneficiaryId,
      type,
      title_ar,
      title_en,
      message_ar,
      message_en,
      relatedType,
      relatedId
    );
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    logger.error('PortalNotifications POST /send error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

// ── PUT /:id — update notification ─────────────────────────────────────
router.put('/:id', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const doc = await PortalNotification.findOneAndUpdate(
      { _id: req.params.id, ...branchFilter(req) },
      stripUpdateMeta(req.body),
      {
        new: true,
        runValidators: true,
      }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    logger.error('PortalNotifications PUT /:id error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

// ── DELETE /:id — remove notification ──────────────────────────────────
router.delete('/:id', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const doc = await PortalNotification.findOneAndDelete({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!doc) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    safeError(res, err, 'PortalNotifications DELETE /:id error');
  }
});

// ── PATCH /:id/read — mark as read ────────────────────────────────────
router.patch('/:id/read', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const doc = await PortalNotification.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!doc) return res.status(404).json({ success: false, message: 'Notification not found' });
    await doc.markAsRead();
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'PortalNotifications PATCH /:id/read error');
  }
});

// ── PATCH /:id/unread — mark as unread ─────────────────────────────────
router.patch('/:id/unread', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const doc = await PortalNotification.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!doc) return res.status(404).json({ success: false, message: 'Notification not found' });
    await doc.markAsUnread();
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'PortalNotifications PATCH /:id/unread error');
  }
});

// ── PATCH /:id/archive — archive notification ─────────────────────────
router.patch('/:id/archive', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const doc = await PortalNotification.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!doc) return res.status(404).json({ success: false, message: 'Notification not found' });
    await doc.archive();
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'PortalNotifications PATCH /:id/archive error');
  }
});

// ── PATCH /:id/unarchive — unarchive notification ─────────────────────
router.patch('/:id/unarchive', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const doc = await PortalNotification.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!doc) return res.status(404).json({ success: false, message: 'Notification not found' });
    await doc.unarchive();
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'PortalNotifications PATCH /:id/unarchive error');
  }
});

// ── POST /mark-all-read — mark all as read for guardian ────────────────
router.post('/mark-all-read', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const { guardianId } = req.body;
    if (!guardianId) {
      return res.status(400).json({ success: false, message: 'guardianId is required' });
    }

    const result = await PortalNotification.updateMany(
      { guardianId, isRead: false, isArchived: false },
      { $set: { isRead: true, readAt: new Date(), status: 'read' } }
    );

    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (err) {
    safeError(res, err, 'PortalNotifications POST /mark-all-read error');
  }
});

module.exports = router;
