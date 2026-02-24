const NotificationAnalytics = require('../models/NotificationAnalytics');
const Notification = require('../models/Notification');

/**
 * دوال تحليلات الإشعارات المتقدمة
 */
const notificationAnalyticsController = {
  /**
   * إحصائيات عامة للإشعارات (usage, delivery, engagement)
   * GET /api/notifications/analytics/summary
   */
  getSummary: async (req, res) => {
    try {
      const userId = req.user._id;
      // إجمالي الإشعارات
      const total = await Notification.countDocuments({ userId });
      // إجمالي المقروءة
      const read = await Notification.countDocuments({ userId, isRead: true });
      // إجمالي غير المقروءة
      const unread = await Notification.countDocuments({ userId, isRead: false });
      // إجمالي أحداث النقر
      const clicks = await NotificationAnalytics.countDocuments({ userId, event: 'clicked' });
      // إجمالي التسليم
      const delivered = await NotificationAnalytics.countDocuments({ userId, event: 'delivered' });
      // معدل التفاعل (النقر/التسليم)
      const engagementRate = delivered > 0 ? (clicks / delivered) * 100 : 0;
      // آخر 7 أيام (usage trend)
      const last7days = await NotificationAnalytics.aggregate([
        {
          $match: {
            userId,
            event: 'delivered',
            timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      res.status(200).json({
        success: true,
        data: {
          total,
          read,
          unread,
          delivered,
          clicks,
          engagementRate,
          usageTrend: last7days,
        },
      });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب تحليلات الإشعارات', error: error.message });
    }
  },
};

module.exports = notificationAnalyticsController;
