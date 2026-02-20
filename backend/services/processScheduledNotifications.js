const ScheduledNotification = require('../models/ScheduledNotification');
const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * خدمة تنفيذ الإشعارات المجدولة (تشغيل دوري)
 */
async function processScheduledNotifications() {
  const now = new Date();
  // جلب الإشعارات المجدولة غير المرسلة والتي حان وقتها
  const due = await ScheduledNotification.find({ sent: false, scheduleTime: { $lte: now } });
  for (const sched of due) {
    // تحقق من المستخدم
    const user = await User.findById(sched.userId);
    if (!user) continue;
    // إنشاء إشعار فعلي
    await Notification.create({
      userId: sched.userId,
      title: sched.title,
      message: sched.message,
      type: 'reminder',
      priority: sched.metadata?.priority || 'normal',
      senderId: sched.createdBy,
      metadata: sched.metadata || {},
      category: 'reminder',
    });
    // تحديث حالة الإرسال
    sched.sent = true;
    sched.sentAt = new Date();
    await sched.save();
    // يمكن إضافة إرسال عبر القنوات الأخرى هنا
  }
}

module.exports = processScheduledNotifications;
