/* eslint-disable no-unused-vars */
// pushService.js
// خدمة إرسال إشعارات Push عبر FCM
// يتطلب إضافة ملف serviceAccountKey.json في backend/config أو backend/

const admin = require('firebase-admin');
const path = require('path');

// تهيئة Firebase Admin SDK مرة واحدة فقط
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(path.join(__dirname, '../config/serviceAccountKey.json')),
    });
  } catch (_e) {
    // إذا لم يوجد ملف الخدمة، تجاهل التهيئة (للاختبار فقط)
  }
}

async function sendPush({ to, tokens, notification, title, body, data } = {}) {
  if (!admin.apps.length) return { success: false, skipped: true, reason: 'fcm_not_configured' };
  const tokenList = tokens || (to ? [to] : []);
  if (!tokenList.length) return { success: false, error: 'no_tokens' };
  const message = {
    notification: notification || { title, body },
    data: data || {},
    tokens: tokenList,
  };
  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    return { success: true, response };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Callable module + named export (for back-compat)
sendPush.sendPush = sendPush;
module.exports = sendPush;
