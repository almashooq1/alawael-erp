/**
 * Portal Notifications Routes — مسارات تنبيهات البوابة
 * CRUD + read/unread + archive + stats for guardian/beneficiary notifications
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const PortalNotification = require('../models/PortalNotification');
const { requireAuth, _requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');
const { safeError } = require('../utils/safeError');

// ── Helpers ────────────────────────────────────────────────────────────
const toId = v => {
  try {
    return new mongoose.Types.ObjectId(v);
  } catch {
    return null;
  }
};

// ── GET / — list notifications (filter by guardian, beneficiary, type, priority, status, read) ──
router.get('/', requireAuth, async (req, res) => {
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

    const filter = {};
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
    logger.error('PortalNotifications GET / error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

// ── GET /stats — notification statistics for a guardian ─────────────────
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const { guardianId } = req.query;
    if (!guardianId) {
      return res.status(400).json({ success: false, message: 'guardianId is required' });
    }

    const gId = toId(guardianId);
    const stats = await PortalNotification.aggregate([
      { $match: { guardianId: gId, isArchived: false } },
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
      { $match: { guardianId: gId, isArchived: false } },
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
    logger.error('PortalNotifications GET /stats error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

// ── GET /guardian/:guardianId — shortcut: all notifications for guardian ──
router.get('/guardian/:guardianId', requireAuth, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const data = await PortalNotification.getForGuardian(req.params.guardianId, Number(limit));
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    logger.error('PortalNotifications GET /guardian/:id error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

// ── GET /guardian/:guardianId/unread — unread notifications ─────────────
router.get('/guardian/:guardianId/unread', requireAuth, async (req, res) => {
  try {
    const data = await PortalNotification.getUnreadForGuardian(req.params.guardianId);
    const count = await PortalNotification.getUnreadCountForGuardian(req.params.guardianId);
    res.json({ success: true, data, count });
  } catch (err) {
    logger.error('PortalNotifications GET /guardian/:id/unread error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

// ── GET /guardian/:guardianId/urgent — urgent unread ────────────────────
router.get('/guardian/:guardianId/urgent', requireAuth, async (req, res) => {
  try {
    const data = await PortalNotification.getUrgentNotifications(req.params.guardianId);
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    logger.error('PortalNotifications GET /guardian/:id/urgent error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

// ── GET /:id — single notification ─────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await PortalNotification.findById(req.params.id)
      .populate('guardianId', 'name phone')
      .populate('beneficiaryId', 'name')
      .populate('sentBy', 'name');
    if (!doc) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    logger.error('PortalNotifications GET /:id error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

// ── POST / — create notification ───────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const doc = await PortalNotification.create({
      ...req.body,
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
router.post('/send', requireAuth, async (req, res) => {
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
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await PortalNotification.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    logger.error('PortalNotifications PUT /:id error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

// ── DELETE /:id — remove notification ──────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await PortalNotification.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    logger.error('PortalNotifications DELETE /:id error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

// ── PATCH /:id/read — mark as read ────────────────────────────────────
router.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    const doc = await PortalNotification.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Notification not found' });
    await doc.markAsRead();
    res.json({ success: true, data: doc });
  } catch (err) {
    logger.error('PortalNotifications PATCH /:id/read error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

// ── PATCH /:id/unread — mark as unread ─────────────────────────────────
router.patch('/:id/unread', requireAuth, async (req, res) => {
  try {
    const doc = await PortalNotification.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Notification not found' });
    await doc.markAsUnread();
    res.json({ success: true, data: doc });
  } catch (err) {
    logger.error('PortalNotifications PATCH /:id/unread error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

// ── PATCH /:id/archive — archive notification ─────────────────────────
router.patch('/:id/archive', requireAuth, async (req, res) => {
  try {
    const doc = await PortalNotification.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Notification not found' });
    await doc.archive();
    res.json({ success: true, data: doc });
  } catch (err) {
    logger.error('PortalNotifications PATCH /:id/archive error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

// ── PATCH /:id/unarchive — unarchive notification ─────────────────────
router.patch('/:id/unarchive', requireAuth, async (req, res) => {
  try {
    const doc = await PortalNotification.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Notification not found' });
    await doc.unarchive();
    res.json({ success: true, data: doc });
  } catch (err) {
    logger.error('PortalNotifications PATCH /:id/unarchive error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

// ── POST /mark-all-read — mark all as read for guardian ────────────────
router.post('/mark-all-read', requireAuth, async (req, res) => {
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
    logger.error('PortalNotifications POST /mark-all-read error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

module.exports = router;
