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
  } catch (e) {
    // إذا لم يوجد ملف الخدمة، تجاهل التهيئة (للاختبار فقط)
  }
}

async function sendPush({ tokens, title, body, data }) {
  if (!admin.apps.length) return { success: false, error: 'FCM not configured' };
  if (!tokens || tokens.length === 0) return { success: false, error: 'No tokens' };
  const message = {
    notification: { title, body },
    data: data || {},
    tokens,
  };
  try {
    const response = await admin.messaging().sendMulticast(message);
    return { success: true, response };
  } catch (error) {
    return { success: false, error };
  }
}

module.exports = { sendPush };
