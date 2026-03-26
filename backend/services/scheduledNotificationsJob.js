/* eslint-disable no-unused-vars */
const mongoose = require('mongoose');
const processScheduledNotifications = require('./processScheduledNotifications');
const logger = require('../utils/logger');

// جدولة تنفيذ الإشعارات المجدولة كل دقيقة
let _intervalId = null;

function startScheduledNotificationsJob() {
  // تأخير البداية لتجنب التضارب مع تهيئة قاعدة البيانات
  setTimeout(() => {
    _intervalId = setInterval(async () => {
      try {
        // تحقق من أن قاعدة البيانات متصلة
        // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
        if (mongoose.connection.readyState !== 1) {
          logger.info('⏭️  MongoDB not connected, skipping scheduled notifications');
          return;
        }

        await processScheduledNotifications();
      } catch (err) {
        if (err.name === 'MongooseError' && err.message?.includes('buffering timed out')) {
          // صامت بشأن timeout errors
        } else {
          logger.error('❌ Scheduled notifications job error:', err.message);
        }
      }
    }, 60 * 1000); // كل دقيقة
  }, 5000); // تأخير 5 ثواني قبل البدء
}

function stopScheduledNotificationsJob() {
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
}

module.exports = { startScheduledNotificationsJob, stopScheduledNotificationsJob };
