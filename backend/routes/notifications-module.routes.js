'use strict';
/**
 * Notifications Module Routes — إدارة الإشعارات والتفضيلات والقوالب الذكية
 * ══════════════════════════════════════════════════════════════════════════
 * Full notifications lifecycle: user preferences, smart notification rules,
 * template management, bulk scheduling, and delivery analytics.
 *
 *   GET    /preferences             get current user's notification preferences
 *   PUT    /preferences             update notification preferences
 *   GET    /preferences/channels    available notification channels
 *   GET    /inbox                   user's notification inbox
 *   PATCH  /inbox/:id/read          mark notification as read
 *   POST   /inbox/mark-all-read     mark all as read
 *   DELETE /inbox/:id               delete notification
 *   GET    /templates               list notification templates
 *   POST   /templates               create notification template
 *   GET    /templates/:id           get template
 *   PUT    /templates/:id           update template
 *   DELETE /templates/:id           delete template
 *   POST   /templates/:id/preview   preview rendered template
 *   GET    /rules                   list smart notification rules
 *   POST   /rules                   create rule
 *   PUT    /rules/:id               update rule
 *   PATCH  /rules/:id/toggle        enable/disable rule
 *   DELETE /rules/:id               delete rule
 *   POST   /send                    send notification (admin/system)
 *   POST   /bulk-send               send bulk notifications
 *   GET    /stats                   notification delivery stats
 */

const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac.v2.middleware');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');
const { stripUpdateMeta } = require('../utils/sanitize');

const router = express.Router();
router.use(authenticate);

// W1207 — mirror of models/Notification.js type enum (unknown values → 'info'
// instead of a ValidationError).
const NOTIF_TYPES = [
  'info',
  'success',
  'warning',
  'error',
  'alert',
  'system',
  'task',
  'reminder',
  'approval',
  'message',
  'update',
  'finance',
  'hr',
  'security',
  'maintenance',
  'general',
  'notification',
];
router.use(requireBranchAccess);

const safeModel = name => {
  try {
    return mongoose.model(name);
  } catch (_) {
    return null;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// PREFERENCES
// ═══════════════════════════════════════════════════════════════════════════

router.get('/preferences', async (req, res) => {
  try {
    const NotifPref = safeModel('NotificationPreference');
    if (!NotifPref)
      return res.json({
        success: true,
        data: { email: true, sms: false, push: true, whatsapp: false },
      });
    const prefs = await NotifPref.findOne({ userId: req.user._id }).lean();
    res.json({ success: true, data: prefs || { email: true, push: true } });
  } catch (err) {
    safeError(res, err, 'get notification preferences');
  }
});

router.put('/preferences', async (req, res) => {
  try {
    const NotifPref = safeModel('NotificationPreference');
    if (!NotifPref)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const prefs = await NotifPref.findOneAndUpdate(
      { userId: req.user._id },
      { ...req.body, userId: req.user._id, updatedAt: new Date() },
      { upsert: true, returnDocument: 'after' }
    );
    res.json({ success: true, data: prefs });
  } catch (err) {
    safeError(res, err, 'update notification preferences');
  }
});

router.get('/preferences/channels', (req, res) => {
  res.json({
    success: true,
    data: [
      { key: 'email', label: 'البريد الإلكتروني', icon: 'mail', configurable: true },
      { key: 'sms', label: 'رسالة نصية', icon: 'message-square', configurable: true },
      { key: 'push', label: 'إشعار فوري', icon: 'bell', configurable: true },
      { key: 'whatsapp', label: 'واتساب', icon: 'message-circle', configurable: true },
      { key: 'in_app', label: 'داخل التطبيق', icon: 'app-window', configurable: false },
    ],
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// INBOX
// ═══════════════════════════════════════════════════════════════════════════

router.get('/inbox', async (req, res) => {
  try {
    const Notif = safeModel('Notification');
    if (!Notif)
      return res.json({ success: true, data: [], pagination: { total: 0 }, unreadCount: 0 });
    const { page = 1, limit = 20, isRead, type } = req.query;
    const filter = { userId: req.user._id, branchId: req.user.branchId };
    if (isRead !== undefined) filter.isRead = isRead === 'true';
    if (type) filter.type = type;
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total, unreadCount] = await Promise.all([
      Notif.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Notif.countDocuments(filter),
      Notif.countDocuments({ userId: req.user._id, isRead: false }),
    ]);
    res.json({
      success: true,
      data,
      pagination: { total, page: Number(page), limit: Number(limit) },
      unreadCount,
    });
  } catch (err) {
    safeError(res, err, 'notification inbox');
  }
});

router.patch('/inbox/:id/read', async (req, res) => {
  try {
    const Notif = safeModel('Notification');
    if (!Notif)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Notif.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true, readAt: new Date() },
      { returnDocument: 'after' }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'mark notification read');
  }
});

router.post('/inbox/mark-all-read', async (req, res) => {
  try {
    const Notif = safeModel('Notification');
    if (!Notif) return res.json({ success: true, data: { modifiedCount: 0 } });
    const result = await Notif.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true, data: { modifiedCount: result.modifiedCount } });
  } catch (err) {
    safeError(res, err, 'mark all read');
  }
});

router.delete('/inbox/:id', async (req, res) => {
  try {
    const Notif = safeModel('Notification');
    if (!Notif)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Notif.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!doc) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    safeError(res, err, 'delete notification');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

router.get('/templates', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const NotifTmpl = safeModel('NotificationTemplate');
    if (!NotifTmpl) return res.json({ success: true, data: [] });
    const { channel, event } = req.query;
    const filter = { branchId: req.user.branchId };
    if (channel) filter.channel = channel;
    if (event) filter.triggerEvent = event;
    const data = await NotifTmpl.find(filter).sort({ name: 1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'list notification templates');
  }
});

router.post('/templates', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const NotifTmpl = safeModel('NotificationTemplate');
    if (!NotifTmpl)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await NotifTmpl.create({
      ...req.body,
      branchId: req.user.branchId,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'create notification template');
  }
});

router.get('/templates/:id', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const NotifTmpl = safeModel('NotificationTemplate');
    if (!NotifTmpl)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await NotifTmpl.findOne({ _id: req.params.id, branchId: req.user.branchId }).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'get notification template');
  }
});

router.put('/templates/:id', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const NotifTmpl = safeModel('NotificationTemplate');
    if (!NotifTmpl)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await NotifTmpl.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId },
      { ...req.body, updatedBy: req.user._id },
      { returnDocument: 'after' }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'update notification template');
  }
});

router.delete('/templates/:id', requireRole('admin'), async (req, res) => {
  try {
    const NotifTmpl = safeModel('NotificationTemplate');
    if (!NotifTmpl)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await NotifTmpl.findOneAndDelete({
      _id: req.params.id,
      branchId: req.user.branchId,
    });
    if (!doc) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, message: 'Template deleted' });
  } catch (err) {
    safeError(res, err, 'delete notification template');
  }
});

router.post(
  '/templates/:id/preview',
  requireRole('admin', 'manager', 'supervisor'),
  async (req, res) => {
    try {
      const NotifTmpl = safeModel('NotificationTemplate');
      if (!NotifTmpl)
        return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
      const tmpl = await NotifTmpl.findOne({
        _id: req.params.id,
        branchId: req.user.branchId,
      }).lean();
      if (!tmpl) return res.status(404).json({ success: false, message: 'Template not found' });
      const { variables = {} } = req.body;
      let rendered = tmpl.body || '';
      Object.entries(variables).forEach(([key, val]) => {
        rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), val);
      });
      res.json({
        success: true,
        data: { subject: tmpl.subject, body: rendered, channel: tmpl.channel },
      });
    } catch (err) {
      safeError(res, err, 'preview template');
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// SMART RULES
// ═══════════════════════════════════════════════════════════════════════════

router.get('/rules', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const SmartNotif = safeModel('SmartNotification');
    if (!SmartNotif) return res.json({ success: true, data: [] });
    const data = await SmartNotif.find({ branchId: req.user.branchId, recordType: 'rule' })
      .sort({ name: 1 })
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'list notification rules');
  }
});

router.post('/rules', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const SmartNotif = safeModel('SmartNotification');
    if (!SmartNotif)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await SmartNotif.create({
      ...req.body,
      recordType: 'rule',
      isEnabled: true,
      branchId: req.user.branchId,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'create notification rule');
  }
});

router.put('/rules/:id', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const SmartNotif = safeModel('SmartNotification');
    if (!SmartNotif)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await SmartNotif.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId, recordType: 'rule' },
      stripUpdateMeta(req.body),
      { returnDocument: 'after' }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Rule not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'update notification rule');
  }
});

router.patch('/rules/:id/toggle', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const SmartNotif = safeModel('SmartNotification');
    if (!SmartNotif)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const rule = await SmartNotif.findOne({
      _id: req.params.id,
      branchId: req.user.branchId,
      recordType: 'rule',
    });
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });
    rule.isEnabled = !rule.isEnabled;
    await rule.save();
    res.json({ success: true, data: { isEnabled: rule.isEnabled } });
  } catch (err) {
    safeError(res, err, 'toggle notification rule');
  }
});

router.delete('/rules/:id', requireRole('admin'), async (req, res) => {
  try {
    const SmartNotif = safeModel('SmartNotification');
    if (!SmartNotif)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await SmartNotif.findOneAndDelete({
      _id: req.params.id,
      branchId: req.user.branchId,
      recordType: 'rule',
    });
    if (!doc) return res.status(404).json({ success: false, message: 'Rule not found' });
    res.json({ success: true, message: 'Rule deleted' });
  } catch (err) {
    safeError(res, err, 'delete notification rule');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SEND & STATS
// ═══════════════════════════════════════════════════════════════════════════

router.post('/send', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const Notif = safeModel('Notification');
    if (!Notif)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const { userId, type, title, body, channel = 'in-app', data: payload } = req.body;
    if (!userId || !title)
      return res.status(400).json({ success: false, message: 'userId and title are required' });
    // W1207 — realigned to the real Notification vocabulary: recipientId +
    // message are REQUIRED (the old payload missed both → threw on every
    // send), the channel enum is hyphenated ('in-app', not 'in_app'), and
    // sentBy/branchId are phantoms (sender provenance goes in metadata).
    const doc = await Notif.create({
      recipientId: userId,
      userId,
      type: NOTIF_TYPES.includes(type) ? type : 'info',
      title,
      message: body || title,
      body,
      channel: channel === 'in_app' ? 'in-app' : channel,
      data: payload,
      metadata: { sentBy: String(req.user._id) },
      isRead: false,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'send notification');
  }
});

router.post('/bulk-send', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const Notif = safeModel('Notification');
    if (!Notif)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const { userIds = [], type, title, body, channel = 'in-app' } = req.body;
    if (!userIds.length || !title)
      return res.status(400).json({ success: false, message: 'userIds and title are required' });
    // W1207 — same realignment as /send (insertMany validates against the
    // schema too: missing recipientId/message + 'in_app' all threw).
    const docs = userIds.map(uid => ({
      recipientId: uid,
      userId: uid,
      type: NOTIF_TYPES.includes(type) ? type : 'info',
      title,
      message: body || title,
      body,
      channel: channel === 'in_app' ? 'in-app' : channel,
      metadata: { sentBy: String(req.user._id) },
      isRead: false,
    }));
    const result = await Notif.insertMany(docs, { ordered: false });
    res.status(201).json({ success: true, data: { sentCount: result.length } });
  } catch (err) {
    safeError(res, err, 'bulk send notifications');
  }
});

router.get('/stats', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const Notif = safeModel('Notification');
    if (!Notif)
      return res.json({ success: true, data: { total: 0, unread: 0, read: 0, byChannel: [] } });
    // W1207 — Notification has no branchId; the phantom filter made every
    // stat zero. Endpoint is reviewer-role gated → global counts.
    const base = {};
    const [total, unread, byChannel] = await Promise.all([
      Notif.countDocuments(base),
      Notif.countDocuments({ ...base, isRead: false }),
      Notif.aggregate([{ $match: base }, { $group: { _id: '$channel', count: { $sum: 1 } } }]),
    ]);
    res.json({ success: true, data: { total, unread, read: total - unread, byChannel } });
  } catch (err) {
    safeError(res, err, 'notification stats');
  }
});

module.exports = router;
