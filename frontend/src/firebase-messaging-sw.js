// src/firebase-messaging-sw.js
// Service Worker for FCM (React/PWA)
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'YOUR_FIREBASE_API_KEY',
  authDomain: 'YOUR_FIREBASE_AUTH_DOMAIN',
  projectId: 'YOUR_FIREBASE_PROJECT_ID',
  messagingSenderId: 'YOUR_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'YOUR_FIREBASE_APP_ID',
});

const messaging = firebase.messaging();

// Handle background push
messaging.onBackgroundMessage(function (payload) {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title, {
    body,
    icon: '/logo192.png',
    data: payload.data || {},
  });
});
