const ScheduledNotification = require('../models/ScheduledNotification');
const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * جدولة الإشعارات والتذكيرات
 */
const scheduledNotificationController = {
  /**
   * إنشاء إشعار مجدول
   * POST /api/notifications/schedule
   */
  schedule: async (req, res) => {
    try {
      const { userId, title, message, channels, scheduleTime, metadata } = req.body;
      const createdBy = req.user._id;
      if (!userId || !title || !message || !scheduleTime) {
        return res
          .status(400)
          .json({
            success: false,
            message: 'الحقول المطلوبة: userId, title, message, scheduleTime',
          });
      }
      const scheduled = await ScheduledNotification.create({
        userId,
        title,
        message,
        channels: channels || ['in-app'],
        scheduleTime,
        createdBy,
        metadata: metadata || {},
      });
      res.status(201).json({ success: true, data: scheduled });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جدولة الإشعار', error: error.message });
    }
  },

  /**
   * جلب الإشعارات المجدولة للمستخدم
   * GET /api/notifications/scheduled
   */
  getMyScheduled: async (req, res) => {
    try {
      const userId = req.user._id;
      const scheduled = await ScheduledNotification.find({ userId }).sort({ scheduleTime: 1 });
      res.status(200).json({ success: true, data: scheduled });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب الإشعارات المجدولة', error: error.message });
    }
  },
};

module.exports = scheduledNotificationController;
