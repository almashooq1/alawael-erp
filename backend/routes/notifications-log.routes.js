/**
 * Notifications log — admin view of every send through unifiedNotifier.
 *
 *   GET /api/v1/admin/notifications-log         list (paginated, filterable)
 *   GET /api/v1/admin/notifications-log/stats   counts by channel + status
 *
 * Mount: app.use('/api/v1/admin/notifications-log', router)
 */

'use strict';

const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const router = express.Router();
router.use(authenticate);

function isAdmin(req) {
  const u = req.user || {};
  return ['admin', 'super_admin'].includes(u.role);
}

// Reuse the inline model from unifiedNotifier (registered when that module loads).
function getModel() {
  // Touch the notifier so its model registers on cold starts.
  try {
    require('../services/unifiedNotifier');
  } catch {
    /* ignore */
  }
  return mongoose.models.NotificationDeliveryLog;
}

router.get('/', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ ok: false, error: 'ADMIN_ONLY' });
    const Log = getModel();
    if (!Log) return res.status(503).json({ ok: false, error: 'LOG_MODEL_UNAVAILABLE' });
    const filter = {};
    if (req.query.channel) filter.channel = req.query.channel;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.templateKey) filter.templateKey = req.query.templateKey;
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) {
        const f = new Date(String(req.query.from));
        if (!isNaN(f)) filter.createdAt.$gte = f;
      }
      if (req.query.to) {
        const t = new Date(String(req.query.to));
        if (!isNaN(t)) {
          t.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = t;
        }
      }
    }
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const skip = Number(req.query.page) > 1 ? (Number(req.query.page) - 1) * limit : 0;
    const [items, total] = await Promise.all([
      Log.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-body -metadata') // body can be 4KB; admin clicks for detail
        .lean(),
      Log.countDocuments(filter),
    ]);
    res.json({ ok: true, items, total });
  } catch (err) {
    return safeError(res, err, 'notificationsLog', { shape: 'ok' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ ok: false, error: 'ADMIN_ONLY' });
    const Log = getModel();
    if (!Log) return res.json({ ok: true, byChannel: [], byStatus: [], byTemplate: [], total: 0 });
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [byChannel, byStatus, byTemplate, total] = await Promise.all([
      Log.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$channel', count: { $sum: 1 } } },
      ]),
      Log.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Log.aggregate([
        { $match: { createdAt: { $gte: since }, templateKey: { $exists: true, $ne: null } } },
        { $group: { _id: '$templateKey', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Log.countDocuments({ createdAt: { $gte: since } }),
    ]);
    res.json({ ok: true, windowDays: days, total, byChannel, byStatus, byTemplate });
  } catch (err) {
    return safeError(res, err, 'notificationsLog', { shape: 'ok' });
  }
});

// Re-fire a failed notification with the same payload. unifiedNotifier
// inserts a new log row, so the original entry stays as historical record.
router.post('/:id/retry', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ ok: false, error: 'ADMIN_ONLY' });
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      return res.status(400).json({ ok: false, error: 'INVALID_ID' });
    }
    const Log = getModel();
    if (!Log) return res.status(503).json({ ok: false, error: 'LOG_MODEL_UNAVAILABLE' });
    const original = await Log.findById(req.params.id).lean();
    if (!original) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });

    let unifiedNotifier = null;
    try {
      unifiedNotifier = require('../services/unifiedNotifier');
    } catch {
      /* unavailable */
    }
    if (!unifiedNotifier?.notify) {
      return res.status(503).json({ ok: false, error: 'NOTIFIER_UNAVAILABLE' });
    }

    const isEmail = /@/.test(original.to);
    await unifiedNotifier.notify({
      to: isEmail ? { email: original.to } : { phone: original.to },
      channels: original.channel ? [original.channel] : 'auto',
      subject: original.subject || '(retry)',
      body: original.body || '',
      priority: original.priority,
      templateKey: `${original.templateKey || 'retry'}.retry`,
      metadata: { ...(original.metadata || {}), retriedFrom: String(original._id) },
    });
    res.json({ ok: true, message: 'تمت إعادة المحاولة' });
  } catch (err) {
    return safeError(res, err, 'notificationsLog', { shape: 'ok' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ ok: false, error: 'ADMIN_ONLY' });
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      return res.status(400).json({ ok: false, error: 'INVALID_ID' });
    }
    const Log = getModel();
    if (!Log) return res.status(503).json({ ok: false, error: 'LOG_MODEL_UNAVAILABLE' });
    const item = await Log.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
    res.json({ ok: true, item });
  } catch (err) {
    return safeError(res, err, 'notificationsLog', { shape: 'ok' });
  }
});

module.exports = router;
