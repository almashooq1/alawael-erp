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
const mongoose = require('mongoose');

// W1166 — cross-user/cross-branch isolation (W269 doctrine). Notifications are
// USER-owned (recipientId), not branch-owned: before this wave ANY authed user
// could read/snooze/archive/delete ANY notification by id (IDOR), bulk-mutate
// arbitrary ids, and send/schedule notifications to anyone. requireBranchAccess
// populates req.branchScope; `restricted === false` (cross-branch admin roles)
// retains full management access.
const { requireBranchAccess } = require('../../../middleware/branchScope.middleware');
const { requireRole } = require('../../../middleware/auth');

let ns;
try {
  ns = require('../index'); // re-exports notificationService
} catch (_e) {
  ns = null;
}

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.use(requireBranchAccess); // W1166 — populate req.branchScope

// W1166 — resolve the canonical Notification model lazily (mirrors hr.routes
// LeaveRequest pattern); 503 fail-closed when unavailable.
function resolveNotificationModel() {
  try {
    return mongoose.model('Notification');
  } catch {
    try {
      require('../../../models/Notification');
      return mongoose.model('Notification');
    } catch {
      return null;
    }
  }
}

// W1166 — ownership param hook: the notification must belong to the caller
// (recipientId / userId / recipient legacy fields) unless the caller holds a
// cross-branch (unrestricted) role.
async function notificationOwnershipParam(req, res, next, id) {
  try {
    if (!mongoose.isValidObjectId(id)) return next(); // route-level handling
    const Notification = resolveNotificationModel();
    if (!Notification) {
      return res.status(503).json({ success: false, message: 'Notification model unavailable' });
    }
    const doc = await Notification.findById(id).select('recipientId userId recipient').lean();
    if (!doc) {
      return res.status(404).json({ success: false, message: 'الإشعار غير موجود' });
    }
    if (req.branchScope && req.branchScope.restricted === false) return next();
    const caller = String(req.user?._id || req.user?.id || '');
    const owner = String(doc.recipientId || doc.userId || doc.recipient || '');
    if (caller && owner && caller === owner) return next();
    return res.status(403).json({ success: false, message: 'لا تملك صلاحية الوصول لهذا الإشعار' });
  } catch (err) {
    return next(err);
  }
}
router.param('notificationId', notificationOwnershipParam);

// W1166 — bulk ops: restricted callers may only act on their OWN ids.
async function filterOwnedIds(req, ids) {
  const valid = (Array.isArray(ids) ? ids : []).filter(i => mongoose.isValidObjectId(i));
  if (!valid.length) return [];
  if (req.branchScope && req.branchScope.restricted === false) return valid;
  const Notification = resolveNotificationModel();
  if (!Notification) return [];
  const userId = req.user?._id || req.user?.id;
  const owned = await Notification.find({
    _id: { $in: valid },
    $or: [{ recipientId: userId }, { userId }, { recipient: userId }],
  })
    .select('_id')
    .lean();
  return owned.map(d => String(d._id));
}

const {
  validateSendNotification,
  validateSendBulk,
  validateScheduleNotification,
  validateSnoozeNotification,
  validate,
} = require('../validators/notifications.validator');

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

/** GET /:notificationId — إشعار واحد */
router.get(
  '/:notificationId',
  requireService,
  asyncHandler(async (req, res) => {
    const notification = await ns.getNotificationById(req.params.notificationId);
    res.json({ success: true, data: notification });
  })
);

/** PATCH /:notificationId/read — تحديد إشعار كمقروء */
router.patch(
  '/:notificationId/read',
  requireService,
  asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    await ns.markAsRead(req.params.notificationId, userId);
    res.json({ success: true, message: 'تم تحديد الإشعار كمقروء' });
  })
);

/** PATCH /:notificationId/snooze — تأجيل إشعار */
router.patch(
  '/:notificationId/snooze',
  requireService,
  validate(validateSnoozeNotification),
  asyncHandler(async (req, res) => {
    const result = await ns.snoozeNotification(req.params.notificationId, req.body.snoozeUntil);
    res.json({ success: true, data: result });
  })
);

/** PATCH /:notificationId/favorite — إضافة/إزالة من المفضلة */
router.patch(
  '/:notificationId/favorite',
  requireService,
  asyncHandler(async (req, res) => {
    const result = await ns.toggleFavorite(req.params.notificationId);
    res.json({ success: true, data: result });
  })
);

/** PATCH /:notificationId/archive — أرشفة إشعار */
router.patch(
  '/:notificationId/archive',
  requireService,
  asyncHandler(async (req, res) => {
    await ns.archiveNotification(req.params.notificationId);
    res.json({ success: true, message: 'تم أرشفة الإشعار' });
  })
);

/** PATCH /:notificationId/restore — استعادة إشعار مؤرشف */
router.patch(
  '/:notificationId/restore',
  requireService,
  asyncHandler(async (req, res) => {
    await ns.restoreNotification(req.params.notificationId);
    res.json({ success: true, message: 'تم استعادة الإشعار' });
  })
);

/** POST /:notificationId/retry — إعادة إرسال إشعار فاشل */
router.post(
  '/:notificationId/retry',
  requireService,
  asyncHandler(async (req, res) => {
    const result = await ns.retrySendNotification(req.params.notificationId);
    res.json({ success: true, data: result });
  })
);

/** DELETE /:notificationId — حذف إشعار */
router.delete(
  '/:notificationId',
  requireService,
  asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    await ns.deleteNotification(req.params.notificationId, userId);
    res.json({ success: true, message: 'تم حذف الإشعار' });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// Bulk operations
// ═══════════════════════════════════════════════════════════════════════════════

/** POST /send — إرسال إشعار (W1166 — أدوار إدارية فقط: منع إساءة الإرسال لأي مستخدم) */
router.post(
  '/send',
  requireService,
  requireRole('admin', 'manager', 'supervisor'),
  validate(validateSendNotification),
  asyncHandler(async (req, res) => {
    const result = await ns.send(req.body);
    res.status(201).json({ success: true, data: result });
  })
);

/** POST /send-bulk — إرسال إشعارات جماعية (W1166 — أدوار إدارية فقط) */
router.post(
  '/send-bulk',
  requireService,
  requireRole('admin', 'manager', 'supervisor'),
  validate(validateSendBulk),
  asyncHandler(async (req, res) => {
    const { recipientIds, ...opts } = req.body;
    const results = await ns.sendBulk(recipientIds, opts);
    res.status(201).json({ success: true, data: results });
  })
);

/** PATCH /bulk/read — تحديد مجموعة إشعارات كمقروءة (W1166 — مقيَّد بإشعارات المستخدم) */
router.patch(
  '/bulk/read',
  requireService,
  asyncHandler(async (req, res) => {
    const ids = await filterOwnedIds(req, req.body.ids); // W1166
    const result = await ns.markMultipleAsRead(ids);
    res.json({ success: true, data: result });
  })
);

/** DELETE /bulk — حذف مجموعة إشعارات (W1166 — مقيَّد بإشعارات المستخدم) */
router.delete(
  '/bulk',
  requireService,
  asyncHandler(async (req, res) => {
    const ids = await filterOwnedIds(req, req.body.ids); // W1166
    const result = await ns.deleteMultiple(ids);
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

/** GET /templates/:templateId — قالب واحد (مورد عام بلا PII — لا يحتاج خطاف ملكية) */
router.get(
  '/templates/:templateId',
  requireService,
  asyncHandler(async (req, res) => {
    const template = await ns.getTemplate(req.params.templateId);
    res.json({ success: true, data: template });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// Scheduling & analytics
// ═══════════════════════════════════════════════════════════════════════════════

/** POST /schedule — جدولة إشعار مستقبلي (W1166 — أدوار إدارية فقط) */
router.post(
  '/schedule',
  requireService,
  requireRole('admin', 'manager', 'supervisor'),
  validate(validateScheduleNotification),
  asyncHandler(async (req, res) => {
    const result = await ns.scheduleNotification(req.body);
    res.status(201).json({ success: true, data: result });
  })
);

/** GET /stats — إحصائيات الإشعارات (W1166 — أدوار إدارية فقط) */
router.get(
  '/stats',
  requireService,
  requireRole('admin', 'manager', 'supervisor'),
  asyncHandler(async (req, res) => {
    const stats = await ns.getStats(req.query);
    res.json({ success: true, data: stats });
  })
);

/** GET /delivery/:notificationId — حالة تسليم إشعار (خطاف الملكية يسري) */
router.get(
  '/delivery/:notificationId',
  requireService,
  asyncHandler(async (req, res) => {
    const status = await ns.getDeliveryStatus(req.params.notificationId);
    res.json({ success: true, data: status });
  })
);

module.exports = router;
