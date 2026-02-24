const mongoose = require('mongoose');
const processScheduledNotifications = require('./processScheduledNotifications');

// جدولة تنفيذ الإشعارات المجدولة كل دقيقة
function startScheduledNotificationsJob() {
  // تأخير البداية لتجنب التضارب مع تهيئة قاعدة البيانات
  setTimeout(() => {
    setInterval(async () => {
      try {
        // تحقق من أن قاعدة البيانات متصلة
        // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
        if (mongoose.connection.readyState !== 1) {
          console.log('⏭️  MongoDB not connected, skipping scheduled notifications');
          return;
        }

        await processScheduledNotifications();
      } catch (err) {
        if (err.name === 'MongooseError' && err.message?.includes('buffering timed out')) {
          // صامت بشأن timeout errors
        } else {
          console.error('❌ Scheduled notifications job error:', err.message);
        }
      }
    }, 60 * 1000); // كل دقيقة
  }, 5000); // تأخير 5 ثواني قبل البدء
}

module.exports = startScheduledNotificationsJob;
