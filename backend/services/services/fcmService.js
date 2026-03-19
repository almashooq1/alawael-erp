// backend/services/fcmService.js
// خدمة إرسال إشعارات Push عبر FCM (Firebase Cloud Messaging)
const axios = require('axios');

const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY || 'YOUR_FCM_SERVER_KEY';
const FCM_API_URL = 'https://fcm.googleapis.com/fcm/send';

const fcmService = {
  /**
   * إرسال إشعار Push إلى جهاز واحد أو أكثر
   * @param {string[]} deviceTokens - قائمة توكنات الأجهزة
   * @param {object} payload - بيانات الإشعار (title, body, data)
   * @returns {Promise<object>} نتيجة الإرسال
   */
  async sendPushNotification(deviceTokens, payload) {
    if (!Array.isArray(deviceTokens) || deviceTokens.length === 0) {
      throw new Error('deviceTokens must be a non-empty array');
    }
    const message = {
      registration_ids: deviceTokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
      priority: 'high',
    };
    try {
      const response = await axios.post(FCM_API_URL, message, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `key=${FCM_SERVER_KEY}`,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error('FCM send error: ' + error.message);
    }
  },
};

module.exports = fcmService;
