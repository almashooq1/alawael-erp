# 🚀 Quick Start Guide - Mobile App (Phase 32)

## البدء السريع لتطبيق الموبايل

### الخطوة 1: التثبيت الأساسي

```bash
# 1. دخول المجلد
cd mobile

# 2. تثبيت الحزم
npm install
# أو باستخدام Yarn
yarn install

# 3. تثبيت الحزم الأصلية (Native)
npx react-native link

# 4. تثبيت حزم iOS (إذا كنت على macOS)
cd ios && pod install && cd ..
```

---

### الخطوة 2: الإعدادات الأولية

#### أ. تحديث API URL
```javascript
// في ملفات الخدمات: services/*.js
// غيّر:
const API_BASE_URL = 'http://localhost:3001/api';
// إلى:
const API_BASE_URL = 'http://YOUR_SERVER_IP:3001/api';
```

#### ب. إعداد Firebase (للإشعارات)
```bash
# Android:
1. انسخ google-services.json من Firebase Console
2. الصقها في: android/app/google-services.json

# iOS:
1. انسخ GoogleService-Info.plist من Firebase Console
2. الصقها في: ios/GoogleService-Info.plist
```

#### ج. إعداد متغيرات البيئة
```bash
# أنشئ ملف .env.local في المجلد الجذر
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_ENVIRONMENT=development
REACT_APP_LOG_LEVEL=debug
```

---

### الخطوة 3: تشغيل التطبيق

#### على Android
```bash
# الطريقة الأولى: امر واحد
npm run android

# الطريقة الثانية: خطوات منفصلة
# 1. بدء Metro bundler
npm start

# 2. في نافذة Terminal جديدة
npm run android
```

#### على iOS
```bash
# الطريقة الأولى: امر واحد
npm run ios

# الطريقة الثانية: خطوات منفصلة
# 1. بدء Metro bundler
npm start

# 2. في نافذة Terminal جديدة
npm run ios -- --simulator="iPhone 14"
```

#### باستخدام Expo (اختياري)
```bash
# التثبيت
npm install -g expo-cli

# التشغيل
expo start

# الخيارات:
# - اضغط 'a' لـ Android
# - اضغط 'i' لـ iOS
# - اضغط 's' لـ Scan QR
```

---

### الخطوة 4: اختبار الميزات الأساسية

#### اختبار تسجيل الدخول
```javascript
بيانات الاختبار:
- Email: test@example.com
- Password: password123

أو استخدم بيانات حقيقية من الخادم
```

#### اختبار GPS
```javascript
1. فعّل خدمة الموقع على جهازك
2. اذهب إلى Dashboard
3. اضغط زر "بدء التتبع"
4. يجب أن ترى خريطة بموقعك
```

#### اختبار الإشعارات
```javascript
1. ارسل إشعار من الخادم
2. يجب أن تشاهده في الإشعارات
3. جرب الفلاتر المختلفة
```

---

### الخطوة 5: مشاكل شائعة والحلول

#### مشكلة: "Cannot find module"
```bash
# الحل:
npm install
rm -rf node_modules
npm install
npx react-native start --reset-cache
```

#### مشكلة: متحرر الموقع لا يعمل
```bash
# Android:
Settings → Apps → Permissions → Location → تفعيل

# iOS:
Settings → Privacy → Location Services → تفعيل التطبيق
```

#### مشكلة: الإشعارات لا تظهر
```bash
# تحقق من:
1. Firebase مهيأة بشكل صحيح
2. الأذونات مفعلة
3. خادم الإشعارات يعمل
```

#### مشكلة: API لا يستجيب
```javascript
// تأكد من:
1. الخادم مشغل: http://localhost:3001
2. URL صحيح
3. CORS مفعل على الخادم
```

---

### الخطوة 6: الاختبار

```bash
# تشغيل جميع الاختبارات
npm test

# تشغيل اختبار محدد
npm test -- MobileApp.test

# تشغيل مع Coverage
npm test -- --coverage

# مراقبة الملفات (Watch Mode)
npm test -- --watch
```

---

### الخطوة 7: البناء للإنتاج

#### Android Release
```bash
# الطريقة 1: من موجه الأوامر
npm run build:android

# الطريقة 2: يدوياً
cd android
./gradlew assembleRelease
cd ..

# التوقيع على APK
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore release.keystore app-release-unsigned.apk my_key

# التوازن (Zipalign)
zipalign -v 4 app-release-unsigned.apk app-release.apk
```

#### iOS Release
```bash
# من Xcode:
1. اختر Scheme: Release
2. اختر Device
3. Run: Product → Build

# أو من CLI:
npm run build:ios
```

---

### الخطوة 8: مراقبة التطبيق

#### عرض السجلات (Logs)
```bash
# Android
adb logcat

# iOS
xcrun simctl spawn booted log stream --predicate 'process == "Runner"'
```

#### أداة Debugging
```bash
# React Native Debugger
npm install --global react-native-debugger

# أو استخدم Chrome DevTools
# اضغط Ctrl+M (Android) أو Cmd+D (iOS)
# اختر "Debug JS Remotely"
```

---

### الخطوة 9: الأوامر المهمة

```bash
# بدء Metro bundler
npm start

# مسح الكاش
npm start -- --reset-cache

# شغّل على Android
npm run android

# شغّل على iOS
npm run ios

# اختبر الكود
npm test

# بناء للإنتاج
npm run build:android
npm run build:ios

# فرمتة الكود
npm run format

# فحص الأخطاء
npm run lint
```

---

### الخطوة 10: البنية الأساسية للملفات

```
mobile/
├── App.jsx              ← نقطة الدخول
├── app.json             ← تكوين التطبيق
├── package.json         ← الحزم والتبعيات
│
├── screens/             ← شاشات التطبيق
│   ├── auth/
│   │   └── LoginScreen.jsx
│   └── app/
│       ├── DashboardScreen.jsx
│       ├── MapScreen.jsx
│       └── ...
│
├── services/            ← خدمات التطبيق
│   ├── AuthService.js
│   ├── GPSService.js
│   └── NotificationService.js
│
├── navigation/          ← إدارة التنقل
│   └── RootNavigator.js
│
└── __tests__/           ← الاختبارات
    └── MobileApp.test.js
```

---

### 🎯 الخطوات التالية

بعد التثبيت الناجح:

1. ✅ جرب تسجيل الدخول
2. ✅ فعّل تتبع GPS
3. ✅ انظر إلى الخريطة
4. ✅ تحقق من الإشعارات
5. ✅ حدّث ملفك الشخصي

---

### 📱 أجهزة الاختبار الموصى بها

**Android:**
- Google Pixel 4/5/6
- Samsung Galaxy S20+
- OnePlus 9/10

**iOS:**
- iPhone 12 أو أحدث
- iPad (اختياري)

---

### 🔗 الموارد الإضافية

- React Native Docs: https://reactnative.dev/docs
- React Navigation: https://reactnavigation.org/
- Firebase: https://firebase.google.com/docs
- Axios: https://axios-http.com/docs

---

### 💬 الدعم والمساعدة

إذا واجهت مشكلة:

1. تحقق من رسالة الخطأ بعناية
2. ابحث عن الحل في الأسفل
3. تحقق من الموارد الإضافية
4. اتصل بفريق الدعم

---

**Happy Coding! 🚀**

تم إنشاؤه بحب من فريق التطوير ❤️
