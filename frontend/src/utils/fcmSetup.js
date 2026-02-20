// src/utils/fcmSetup.js
// تهيئة FCM في React (PWA)
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import fcmService from '../services/fcmService';

const firebaseConfig = {
  apiKey: 'YOUR_FIREBASE_API_KEY',
  authDomain: 'YOUR_FIREBASE_AUTH_DOMAIN',
  projectId: 'YOUR_FIREBASE_PROJECT_ID',
  messagingSenderId: 'YOUR_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'YOUR_FIREBASE_APP_ID',
};

export async function setupFCM(jwtToken) {
  const app = initializeApp(firebaseConfig);
  const messaging = getMessaging(app);
  try {
    const currentToken = await getToken(messaging, {
      vapidKey: 'YOUR_FIREBASE_VAPID_KEY',
      serviceWorkerRegistration: await navigator.serviceWorker.ready,
    });
    if (currentToken) {
      await fcmService.registerToken(currentToken, jwtToken);
      // يمكنك عرض إشعار نجاح أو حفظ التوكن محلياً
    }
  } catch (err) {
    // فشل في الحصول على التوكن
    console.error('FCM token error:', err);
  }

  // استقبال الإشعارات أثناء عمل التطبيق
  onMessage(messaging, payload => {
    // يمكنك هنا عرض Toast أو إشعار مخصص
    console.log('📲 FCM foreground message:', payload);
  });
}
