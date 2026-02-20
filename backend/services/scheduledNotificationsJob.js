const processScheduledNotifications = require('./processScheduledNotifications');

// جدولة تنفيذ الإشعارات المجدولة كل دقيقة
function startScheduledNotificationsJob() {
  setInterval(async () => {
    try {
      await processScheduledNotifications();
    } catch (err) {
      console.error('Scheduled notifications job error:', err);
    }
  }, 60 * 1000); // كل دقيقة
}

module.exports = startScheduledNotificationsJob;
