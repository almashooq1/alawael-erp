/**
 * notify.routes.js — staff endpoint to dispatch notifications.
 *
 * POST /api/notify          — send to a single recipient
 * POST /api/notify/bulk     — up to 500 recipients per request
 * GET  /api/notify/logs     — audit trail (paginated)
 * GET  /api/notify/stats    — delivery stats for dashboard
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { notify, NotificationLog } = require('../services/unifiedNotifier');
const safeError = require('../utils/safeError');

router.use(authenticateToken);

const STAFF_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'coordinator',
];

// ── POST / — single recipient ──────────────────────────────────────────
router.post('/', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    const { to, channels, subject, body, priority, templateKey, beneficiaryId, metadata } =
      req.body || {};
    if (!to || !body) return res.status(400).json({ success: false, message: 'to + body مطلوبان' });
    const result = await notify({
      to,
      channels,
      subject,
      body,
      priority,
      templateKey,
      beneficiaryId,
      userId: req.user?.id,
      metadata,
    });
    res.json(result);
  } catch (err) {
    return safeError(res, err, 'notify.send');
  }
});

// ── POST /bulk — up to 500 recipients ──────────────────────────────────
router.post('/bulk', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    const { recipients, channels, subject, body, priority, templateKey, metadata } = req.body || {};
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, message: 'recipients[] مطلوب' });
    }
    if (recipients.length > 500) {
      return res.status(400).json({ success: false, message: 'الحد الأقصى 500 مستلم لكل طلب' });
    }
    if (!body) return res.status(400).json({ success: false, message: 'body مطلوب' });

    // Throttle: 50 concurrent max
    const chunks = [];
    const CONCURRENCY = 50;
    for (let i = 0; i < recipients.length; i += CONCURRENCY)
      chunks.push(recipients.slice(i, i + CONCURRENCY));

    const allResults = [];
    let sent = 0;
    let failed = 0;
    for (const chunk of chunks) {
      const settled = await Promise.allSettled(
        chunk.map(r =>
          notify({
            to: r.to || r,
            channels,
            subject: r.subject || subject,
            body: r.body || body,
            priority,
            templateKey,
            beneficiaryId: r.beneficiaryId,
            userId: req.user?.id,
            metadata: { ...metadata, ...r.metadata },
          })
        )
      );
      for (const s of settled) {
        if (s.status === 'fulfilled' && s.value?.success) sent++;
        else failed++;
        allResults.push(
          s.status === 'fulfilled' ? s.value : { success: false, error: s.reason?.message }
        );
      }
    }
    res.json({ success: true, total: recipients.length, sent, failed, results: allResults });
  } catch (err) {
    return safeError(res, err, 'notify.bulk');
  }
});

// ── GET /logs — audit ───────────────────────────────────────────────────
router.get('/logs', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    const { channel, status, q, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (channel) filter.channel = channel;
    if (status) filter.status = status;
    if (q && typeof q === 'string' && q.trim()) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ to: rx }, { subject: rx }];
    }
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const [items, total] = await Promise.all([
      NotificationLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      NotificationLog.countDocuments(filter),
    ]);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'notify.logs');
  }
});

// ── GET /stats — delivery dashboard ─────────────────────────────────────
router.get('/stats', requireRole(STAFF_ROLES), async (_req, res) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const [total, byChannel, byStatus, last30days] = await Promise.all([
      NotificationLog.countDocuments({}),
      NotificationLog.aggregate([{ $group: { _id: '$channel', count: { $sum: 1 } } }]),
      NotificationLog.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      NotificationLog.countDocuments({ createdAt: { $gte: since } }),
    ]);
    res.json({
      success: true,
      total,
      last30days,
      byChannel: Object.fromEntries(byChannel.map(r => [r._id, r.count])),
      byStatus: Object.fromEntries(byStatus.map(r => [r._id, r.count])),
    });
  } catch (err) {
    return safeError(res, err, 'notify.stats');
  }
});

module.exports = router;
