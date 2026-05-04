/**
 * Notifications Routes — مسارات API للإشعارات الموحدة
 *
 * الهدف التشغيلي: إدارة دورة حياة الإشعارات لكل مستخدم —
 * الإرسال، القراءة، التفضيلات، القوالب، الجدولة، والتحليلات.
 *
 * @module domains/notifications/routes/notifications.routes
 */

'use strict';

const express = require('express');
const router = express.Router();

let ns;
try {
  ns = require('../index'); // re-exports notificationService
} catch (_e) {
  ns = null;
}

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const requireService = (req, res, next) => {
  if (!ns) {
    return res.status(503).json({ success: false, message: 'Notification service unavailable' });
  }
  return next();
};

// ═══════════════════════════════════════════════════════════════════════════════
// User notifications
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /me — إشعارات المستخدم الحالي */
router.get(
  '/me',
  requireService,
  asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    const { page = 1, limit = 20, type } = req.query;
    const result = await ns.getNotifications(userId, {
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 100),
      type,
    });
    res.json({ success: true, ...result });
  })
);

/** GET /me/unread-count — عدد الإشعارات غير المقروءة */
router.get(
  '/me/unread-count',
  requireService,
  asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    const count = await ns.getUnreadCount(userId);
    res.json({ success: true, data: { count } });
  })
);

/** GET /me/unread-count-by-type — عدد غير المقروءة حسب النوع */
router.get(
  '/me/unread-count-by-type',
  requireService,
  asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    const data = await ns.getUnreadCountByType(userId);
    res.json({ success: true, data });
  })
);

/** PATCH /me/read-all — تحديد جميع الإشعارات كمقروءة */
router.patch(
  '/me/read-all',
  requireService,
  asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    await ns.markAllAsRead(userId);
    res.json({ success: true, message: 'تم تحديد جميع الإشعارات كمقروءة' });
  })
);

/** DELETE /me/read — حذف الإشعارات المقروءة */
router.delete(
  '/me/read',
  requireService,
  asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    const result = await ns.deleteReadNotifications(userId);
    res.json({ success: true, data: result });
  })
);

/** DELETE /me/all — حذف جميع إشعارات المستخدم */
router.delete(
  '/me/all',
  requireService,
  asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    await ns.deleteAllNotifications(userId);
    res.json({ success: true, message: 'تم حذف جميع الإشعارات' });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// Single notification
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /:id — إشعار واحد */
router.get(
  '/:id',
  requireService,
  asyncHandler(async (req, res) => {
    const notification = await ns.getNotificationById(req.params.id);
    res.json({ success: true, data: notification });
  })
);

/** PATCH /:id/read — تحديد إشعار كمقروء */
router.patch(
  '/:id/read',
  requireService,
  asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    await ns.markAsRead(req.params.id, userId);
    res.json({ success: true, message: 'تم تحديد الإشعار كمقروء' });
  })
);

/** PATCH /:id/snooze — تأجيل إشعار */
router.patch(
  '/:id/snooze',
  requireService,
  asyncHandler(async (req, res) => {
    const result = await ns.snoozeNotification(req.params.id, req.body.snoozeUntil);
    res.json({ success: true, data: result });
  })
);

/** PATCH /:id/favorite — إضافة/إزالة من المفضلة */
router.patch(
  '/:id/favorite',
  requireService,
  asyncHandler(async (req, res) => {
    const result = await ns.toggleFavorite(req.params.id);
    res.json({ success: true, data: result });
  })
);

/** PATCH /:id/archive — أرشفة إشعار */
router.patch(
  '/:id/archive',
  requireService,
  asyncHandler(async (req, res) => {
    await ns.archiveNotification(req.params.id);
    res.json({ success: true, message: 'تم أرشفة الإشعار' });
  })
);

/** PATCH /:id/restore — استعادة إشعار مؤرشف */
router.patch(
  '/:id/restore',
  requireService,
  asyncHandler(async (req, res) => {
    await ns.restoreNotification(req.params.id);
    res.json({ success: true, message: 'تم استعادة الإشعار' });
  })
);

/** POST /:id/retry — إعادة إرسال إشعار فاشل */
router.post(
  '/:id/retry',
  requireService,
  asyncHandler(async (req, res) => {
    const result = await ns.retrySendNotification(req.params.id);
    res.json({ success: true, data: result });
  })
);

/** DELETE /:id — حذف إشعار */
router.delete(
  '/:id',
  requireService,
  asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    await ns.deleteNotification(req.params.id, userId);
    res.json({ success: true, message: 'تم حذف الإشعار' });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// Bulk operations
// ═══════════════════════════════════════════════════════════════════════════════

/** POST /send — إرسال إشعار */
router.post(
  '/send',
  requireService,
  asyncHandler(async (req, res) => {
    const result = await ns.send(req.body);
    res.status(201).json({ success: true, data: result });
  })
);

/** POST /send-bulk — إرسال إشعارات جماعية */
router.post(
  '/send-bulk',
  requireService,
  asyncHandler(async (req, res) => {
    const { recipientIds, ...opts } = req.body;
    const results = await ns.sendBulk(recipientIds, opts);
    res.status(201).json({ success: true, data: results });
  })
);

/** PATCH /bulk/read — تحديد مجموعة إشعارات كمقروءة */
router.patch(
  '/bulk/read',
  requireService,
  asyncHandler(async (req, res) => {
    const result = await ns.markMultipleAsRead(req.body.ids);
    res.json({ success: true, data: result });
  })
);

/** DELETE /bulk — حذف مجموعة إشعارات */
router.delete(
  '/bulk',
  requireService,
  asyncHandler(async (req, res) => {
    const result = await ns.deleteMultiple(req.body.ids);
    res.json({ success: true, data: result });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// Preferences
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /preferences/me — تفضيلات المستخدم */
router.get(
  '/preferences/me',
  requireService,
  asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    const prefs = await ns.getPreferences(userId);
    res.json({ success: true, data: prefs });
  })
);

/** PUT /preferences/me — تحديث التفضيلات */
router.put(
  '/preferences/me',
  requireService,
  asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    const result = await ns.updatePreferences(userId, req.body);
    res.json({ success: true, data: result });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// Templates
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /templates — قائمة القوالب */
router.get(
  '/templates',
  requireService,
  asyncHandler(async (req, res) => {
    const templates = await ns.getTemplates(req.query);
    res.json({ success: true, data: templates });
  })
);

/** GET /templates/:id — قالب واحد */
router.get(
  '/templates/:id',
  requireService,
  asyncHandler(async (req, res) => {
    const template = await ns.getTemplate(req.params.id);
    res.json({ success: true, data: template });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// Scheduling & analytics
// ═══════════════════════════════════════════════════════════════════════════════

/** POST /schedule — جدولة إشعار مستقبلي */
router.post(
  '/schedule',
  requireService,
  asyncHandler(async (req, res) => {
    const result = await ns.scheduleNotification(req.body);
    res.status(201).json({ success: true, data: result });
  })
);

/** GET /stats — إحصائيات الإشعارات */
router.get(
  '/stats',
  requireService,
  asyncHandler(async (req, res) => {
    const stats = await ns.getStats(req.query);
    res.json({ success: true, data: stats });
  })
);

/** GET /delivery/:id — حالة تسليم إشعار */
router.get(
  '/delivery/:id',
  requireService,
  asyncHandler(async (req, res) => {
    const status = await ns.getDeliveryStatus(req.params.id);
    res.json({ success: true, data: status });
  })
);

module.exports = router;
