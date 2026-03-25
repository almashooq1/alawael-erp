/**
 * Smart Notification Center Routes
 * مسارات مركز الإشعارات الذكي
 */
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const SmartNotification = require('../models/SmartNotification');

router.use(authenticate);

// ─── List notifications ──────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { isRead, category, page = 1, limit = 30 } = req.query;
    const filter = { recipient: req.user.id };
    if (isRead !== undefined) filter.isRead = isRead === 'true';
    if (category) filter.category = category;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      SmartNotification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(+limit).lean(),
      SmartNotification.countDocuments(filter),
    ]);
    const unreadCount = await SmartNotification.countDocuments({ recipient: req.user.id, isRead: false });
    res.json({ success: true, data, unreadCount, pagination: { page: +page, limit: +limit, total }, message: 'قائمة الإشعارات' });
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الإشعارات' });
  }
});

// ─── Mark one as read ────────────────────────────────────────────────────────
router.put('/:id/read', async (req, res) => {
  try {
    const notif = await SmartNotification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { isRead: true, readAt: new Date() },
      { new: true }
    ).lean();
    if (!notif) return res.status(404).json({ success: false, message: 'الإشعار غير موجود' });
    res.json({ success: true, data: notif, message: 'تم تحديد الإشعار كمقروء' });
  } catch (error) {
    logger.error('Error marking notification read:', error);
    res.status(500).json({ success: false, message: 'خطأ في تحديث الإشعار' });
  }
});

// ─── Mark all as read ────────────────────────────────────────────────────────
router.put('/read-all', async (req, res) => {
  try {
    const result = await SmartNotification.updateMany(
      { recipient: req.user.id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true, data: { modifiedCount: result.modifiedCount }, message: 'تم تحديد جميع الإشعارات كمقروءة' });
  } catch (error) {
    logger.error('Error marking all read:', error);
    res.status(500).json({ success: false, message: 'خطأ في تحديث الإشعارات' });
  }
});

// ─── Delete notification ─────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const notif = await SmartNotification.findOneAndDelete({ _id: req.params.id, recipient: req.user.id });
    if (!notif) return res.status(404).json({ success: false, message: 'الإشعار غير موجود' });
    res.json({ success: true, message: 'تم حذف الإشعار' });
  } catch (error) {
    logger.error('Error deleting notification:', error);
    res.status(500).json({ success: false, message: 'خطأ في حذف الإشعار' });
  }
});

// ─── Get preferences ─────────────────────────────────────────────────────────
router.get('/preferences', async (req, res) => {
  try {
    res.json({
      success: true,
      data: { email: true, push: true, sms: false, inApp: true, categories: ['system', 'task', 'approval', 'alert'] },
      message: 'تفضيلات الإشعارات',
    });
  } catch (error) {
    logger.error('Error fetching preferences:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب التفضيلات' });
  }
});

// ─── Update preferences ──────────────────────────────────────────────────────
router.put('/preferences', async (req, res) => {
  try {
    res.json({ success: true, data: req.body, message: 'تم تحديث التفضيلات' });
  } catch (error) {
    logger.error('Error updating preferences:', error);
    res.status(500).json({ success: false, message: 'خطأ في تحديث التفضيلات' });
  }
});

// ─── Send notification (admin) ───────────────────────────────────────────────
router.post('/send', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { recipient, title, message, type, category, priority, channel } = req.body;
    if (!recipient || !title || !message) {
      return res.status(400).json({ success: false, message: 'المستلم والعنوان والرسالة مطلوبة' });
    }
    const notif = await SmartNotification.create({
      recipient, title, message, type: type || 'custom',
      category: category || 'system', priority: priority || 'medium',
      channel: channel || 'in_app', sentBy: req.user.id,
    });
    res.status(201).json({ success: true, data: notif, message: 'تم إرسال الإشعار' });
  } catch (error) {
    logger.error('Error sending notification:', error);
    res.status(500).json({ success: false, message: 'خطأ في إرسال الإشعار' });
  }
});

// ─── Notification templates ──────────────────────────────────────────────────
router.get('/templates', async (req, res) => {
  try {
    res.json({
      success: true,
      data: [
        { id: 'approval', name: 'طلب موافقة', template: 'يرجى مراجعة والموافقة على {item}' },
        { id: 'reminder', name: 'تذكير', template: 'تذكير: {item} يستحق في {date}' },
        { id: 'alert', name: 'تنبيه', template: 'تنبيه عاجل: {message}' },
      ],
      message: 'قوالب الإشعارات',
    });
  } catch (error) {
    logger.error('Error fetching templates:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب القوالب' });
  }
});

module.exports = router;
