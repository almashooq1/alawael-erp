const ScheduledNotification = require('../models/ScheduledNotification');
const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * خدمة تنفيذ الإشعارات المجدولة (تشغيل دوري)
 * مع معالجة أفضل للأخطاء والـ timeouts
 */
async function processScheduledNotifications() {
  try {
    // تحديد timeout لعملية البحث (8 ثواني بدلاً من الافتراضي)
    const now = new Date();
    
    // جلب الإشعارات المجدولة غير المرسلة والتي حان وقتها
    // مع تعطيل buffer timeout
    const due = await ScheduledNotification.find(
      { sent: false, scheduleTime: { $lte: now } }
    )
      .maxTimeMS(8000)
      .limit(100) // حد أقصى 100 إشعار في كل مرة
      .exec();

    if (!due || due.length === 0) {
      return; // لا توجد إشعارات مجدولة
    }

    for (const sched of due) {
      try {
        // تحقق من المستخدم
        const user = await User.findById(sched.userId).maxTimeMS(5000);
        if (!user) {
          // تحديث الحالة حتى لو لم يوجد المستخدم
          sched.sent = true;
          sched.sentAt = new Date();
          await sched.save();
          continue;
        }

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
      } catch (itemErr) {
        console.warn(`⚠️  Error processing scheduled notification ${sched._id}:`, itemErr.message);
        // تابع مع الإشعارات التالية
        continue;
      }
    }
  } catch (err) {
    if (err.name === 'MongooseError' || err.message?.includes('buffering timed out')) {
      // لا تطبع رسائل error على stderr للـ timeout errors
      return;
    }
    console.error('Error in processScheduledNotifications:', err.message);
  }
}

module.exports = processScheduledNotifications;
