# 📱 نظام إدارة الرخص السعودية - تطبيق الهاتف الذكي

## Version 2.1.0 - Mobile First Architecture

---

## 📋 جدول المحتويات

1. [نظرة عامة](#نظرة-عامة)
2. [المتطلبات والتثبيت](#المتطلبات-والتثبيت)
3. [هيكل المشروع](#هيكل-المشروع)
4. [المكونات الرئيسية](#المكونات-الرئيسية)
5. [الميزات](#الميزات)
6. [دليل التطوير](#دليل-التطوير)
7. [الواجهات البرمجية](#الواجهات-البرمجية)
8. [الأمان والمصادقة](#الأمان-والمصادقة)
9. [الاختبار والنشر](#الاختبار-والنشر)
10. [استكشاف الأخطاء](#استكشاف-الأخطاء)

---

## 🎯 نظرة عامة

تطبيق الهاتف الذكي لنظام إدارة الرخص والتصاريح السعودية مبني على **React Native** مع معمارية **Offline-First** لضمان التوفر المستمر حتى في الاتصالات البطيئة.

### الخصائص الرئيسية:

- ✅ دعم **iOS** و **Android**
- ✅ معمارية **Offline-First** مع المزامنة التلقائية
- ✅ المصادقة البيومترية (بصمة الوجه والبصمة)
- ✅ إشعارات فورية عبر **Firebase Cloud Messaging**
- ✅ مسح المستندات بالكاميرا
- ✅ واجهة عربية **RTL** كاملة
- ✅ دعم **Dark/Light Mode**
- ✅ تخزين آمن للبيانات الحساسة
- ✅ رسوم بيانية تفاعلية
- ✅ تكامل مع الخدمات الحكومية السعودية

---

## 🛠️ المتطلبات والتثبيت

### المتطلبات الأساسية:

```bash
Node.js >= 16.0.0
npm >= 8.0.0
React Native CLI >= 2.0.0
Android SDK >= 21 (for Android)
Xcode >= 13.0 (for iOS)
```

### تثبيت التطبيق:

```bash
# Clone المشروع
git clone https://github.com/saudi-license-system/mobile-app.git
cd mobile-app

# تثبيت المكتبات
npm install
# أو
yarn install

# تثبيت CocoaPods للمشاريع iOS
cd ios && pod install && cd ..

# تشغيل التطبيق على Android
npm run android
# أو React Native
react-native run-android

# تشغيل التطبيق على iOS
npm run ios
# أو React Native
react-native run-ios

# بدء خادم Metro
npm start
```

### إعدادات البيئة:

```bash
# في ملف .env أو مباشرة في الكود
REACT_APP_API_URL=https://api.license-system.sa/v1
REACT_APP_FIREBASE_PROJECT_ID=saudi-license-prod
REACT_APP_APP_VERSION=2.1.0
```

---

## 📁 هيكل المشروع

```
mobile/
├── src/
│   ├── screens/              # شاشات التطبيق
│   │   ├── auth/            # شاشات المصادقة
│   │   ├── home/            # الشاشة الرئيسية
│   │   ├── licenses/        # إدارة الرخص
│   │   ├── documents/       # المستندات
│   │   ├── payments/        # المدفوعات
│   │   ├── profile/         # الملف الشخصي
│   │   ├── services/        # الخدمات الحكومية
│   │   ├── reports/         # التقارير
│   │   └── help/            # المساعدة
│   ├── navigation/          # التنقل والملاحة
│   │   ├── MainNavigator.js
│   │   ├── AuthNavigator.js
│   │   └── LinkingConfiguration.js
│   ├── services/            # خدمات API والعمليات
│   │   ├── mobileApiService.js      # API Client
│   │   ├── notificationService.js   # الإشعارات
│   │   ├── analyticsService.js      # التحليلات
│   │   ├── storageService.js        # التخزين الآمن
│   │   ├── biometricService.js      # المصادقة البيومترية
│   │   ├── cameraService.js         # الكاميرا ومسح المستندات
│   │   └── syncService.js           # المزامنة الذاتية
│   ├── redux/               # إدارة الحالة
│   │   ├── store.js
│   │   ├── slices/
│   │   │   ├── authSlice.js
│   │   │   ├── licensesSlice.js
│   │   │   ├── paymentsSlice.js
│   │   │   └── uiSlice.js
│   │   └── middlewares/
│   ├── context/             # Context API
│   │   ├── ThemeContext.js
│   │   ├── LanguageContext.js
│   │   └── UserContext.js
│   ├── components/          # المكونات القابلة لإعادة الاستخدام
│   │   ├── common/
│   │   ├── buttons/
│   │   ├── cards/
│   │   ├── dialogs/
│   │   └── charts/
│   ├── utils/               # الدوال المساعدة
│   │   ├── validators.js
│   │   ├── formatters.js
│   │   ├── notifications.js
│   │   ├── storage.js
│   │   └── helpers.js
│   ├── hooks/               # React Hooks المخصصة
│   │   ├── useApi.js
│   │   ├── useTheme.js
│   │   ├── useBiometric.js
│   │   ├── useOfflineSync.js
│   │   └── useNotification.js
│   ├── i18n/                # تعريب متعدد اللغات
│   │   ├── config.js
│   │   └── translations/
│   │       ├── ar.json
│   │       └── en.json
│   ├── assets/              # الصور والأيقونات
│   │   ├── images/
│   │   ├── icons/
│   │   ├── lottie/
│   │   └── fonts/
│   ├── constants/           # الثوابت والإعدادات
│   │   ├── colors.js
│   │   ├── dimensions.js
│   │   ├── strings.js
│   │   └── config.js
│   ├── App.js              # نقطة البداية
│   └── index.js            # نقطة الدخول
├── android/                 # مشروع Android
├── ios/                     # مشروع iOS
├── tests/                   # اختبارات
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example            # متغيرات البيئة النموذجية
├── .eslintrc.js           # قواعد ESLint
├── .prettierrc.js         # تنسيق Prettier
├── package.json           # المكتبات والسكريبتات
└── README.md              # التوثيق الأساسي
```

---

## 🎨 المكونات الرئيسية

### 1. **Navigation (الملاحة)**

#### MainNavigator (متصفح بالتبويبات السفلية)

```javascript
- Home Tab (الرئيسية)
- Licenses Tab (الرخص)
- Documents Tab (المستندات)
- Payments Tab (المدفوعات)
- Profile Tab (الملف الشخصي)
```

#### AuthNavigator (شاشات المصادقة)

```javascript
- Onboarding Screen
- Login Screen
- Register Screen
- Biometric Auth Screen
- OTP Verification Screen
- Password Reset Screen
- Nafath Auth Screen
```

### 2. **Services (الخدمات)**

#### mobileApiService

- HTTP Client مع Caching ذكي
- معالجة الأخطاء والـ Retry
- تخزين مؤقت للطلبات
- إدارة التوكنات

```javascript
// استخدام:
const data = await mobileApiService.get('/licenses', { cache: true });
await mobileApiService.post('/payments', paymentData);
```

#### notificationService

- إشعارات Firebase Cloud Messaging
- إشعارات محلية
- إدارة القنوات
- تتبع الإشعارات

#### storageService

- تخزين آمن للبيانات الحساسة
- AsyncStorage لل serializable data
- Keychain/Keystore للتوكنات
- Encryption اختياري

#### biometricService

- تفعيل المصادقة البيومترية
- بصمة الوجه والبصمة
- معالجة الأخطاء

### 3. **State Management (إدارة الحالة)**

استخدام **Redux Toolkit** + **Redux Persist**:

```javascript
// Redux Slices:
- authSlice (المستخدم والمصادقة)
- licensesSlice (الرخص والبيانات)
- paymentsSlice (المدفوعات)
- uiSlice (حالة الواجهة)
```

### 4. **Theme & Styling**

دعم **Dark/Light Mode**:

```javascript
// Context API للموضوع
const { theme, isDarkMode, toggleTheme } = useTheme();

// الألوان الديناميكية:
theme.colors.primary;
theme.colors.background;
theme.colors.surface;
theme.colors.text;
```

---

## ⭐ الميزات

### 🏠 الشاشة الرئيسية

- **بطاقات حالة الرخص**
  - عرض الرخص النشطة والمنتهية
  - شريط تقدم بصري
  - حالة ملونة

- **الإحصائيات السريعة**
  - إجمالي الرخص
  - الرخص النشطة
  - الرخص التي تنتهي قريباً

- **الإجراءات السريعة**
  - الوصول المباشر للمستندات
  - الدفع السريع
  - عرض الإشعارات
  - خدمات حكومية

- **آخر الإشعارات**
  - عرض آخر 5 إشعارات
  - تصنيف حسب الأولوية
  - إجراءات سريعة

### 📄 إدارة الرخص

- **قائمة الرخص**
  - تصفية وبحث
  - ترتيب قابل للتخصيص
  - عرض مفصل

- **تفاصيل الرخصة**
  - معلومات كاملة
  - تاريخ الانتهاء والتجديد
  - متطلبات التجديد
  - الوثائق المطلوبة

- **عملية التجديد**
  - نموذج تجديد إلكترونية
  - تحميل المستندات
  - دفع الرسوم
  - تتبع الحالة

### 📄 المستندات

- **مسح المستندات**
  - استخدام الكاميرا
  - كشف الحواف التلقائي
  - تحسين الصورة
  - OCR (اختياري)

- **إدارة المستندات**
  - حفظ المستندات
  - المشاركة
  - الحذف الآمن
  - الإصدارات القديمة

### 💳 المدفوعات

- **7 طرق دفع**
  - SADAD
  - Mada و Visa
  - Apple Pay
  - STC Pay
  - Bank Transfer

- **فاتورة ZATCA**
  - توليد تلقائي
  - QR Code
  - التوقيع الرقمي

### 👤 الملف الشخصي

- **معلومات المستخدم**
  - البيانات الأساسية
  - الصورة الشخصية
  - معلومات التواصل

- **الإعدادات**
  - Dark/Light Mode
  - لغة التطبيق (AR/EN)
  - إشعارات
  - الخصوصية والأمان

- **المصادقة البيومترية**
  - تفعيل/تعطيل
  - بصمة الوجه
  - بصمة الإصبع

### 🔔 الإشعارات

- **أنواع الإشعارات**
  - تنبيهات التجديد
  - تنبيهات الدفع
  - تحديثات النظام
  - رسائل شخصية

- **قنوات الإشعار**
  - Push Notifications
  - In-App Notifications
  - Email (إختياري)
  - SMS (إختياري)

### 📊 التقارير والإحصائيات

- **رسوم بيانية تفاعلية**
  - Pie Charts للتوزيع
  - Line Charts للاتجاهات
  - Bar Charts للمقارنة

- **التقارير المتقدمة**
  - تقرير الرخص
  - تقرير المدفوعات
  - تقرير الامتثال

### 🌐 الخدمات الحكومية

- **الروابط المباشرة**
  - وزارة التجارة
  - البلدية
  - الدفاع المدني
  - وزارة الصحة
  - - 7 جهات أخرى

- **خدمات متكاملة**
  - التحقق من الرخص
  - التجديد الإلكتروني
  - دفع الرسوم

---

## 📚 دليل التطوير

### إنشاء شاشة جديدة

```javascript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const MyScreen = ({ navigation, route }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>شاشتي</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
});

export default MyScreen;
```

### استخدام API Service

```javascript
import mobileApiService from '../../services/mobileApiService';

// GET request
const data = await mobileApiService.get('/endpoint');

// POST request
const result = await mobileApiService.post('/endpoint', data);

// Upload file
const response = await mobileApiService.uploadFile('/upload', file, progress => console.log(`${progress}%`));
```

### استخدام Redux

```javascript
import { useDispatch, useSelector } from 'react-redux';
import { setLicenses, setLoading } from '../../redux/slices/licensesSlice';

const MyComponent = () => {
  const dispatch = useDispatch();
  const licenses = useSelector(state => state.licenses.data);
  const loading = useSelector(state => state.licenses.loading);

  // Update state
  dispatch(setLoading(true));
  dispatch(setLicenses(newLicenses));
};
```

---

## 🔐 الأمان والمصادقة

### المصادقة البيومترية

```javascript
import biometricService from '../../services/biometricService';

const authenticate = async () => {
  const result = await biometricService.authenticate({
    reason: 'تفعيل المصادقة البيومترية',
    fallbackToDevicePasscode: true,
  });

  if (result.success) {
    // تم التحقق بنجاح
  }
};
```

### تخزين آمن للبيانات

```javascript
import storageService from '../../services/storageService';

// حفظ مشفر
await storageService.setSecureItem('accessToken', token);

// استرجاع مشفر
const token = await storageService.getSecureItem('accessToken');

// حذف آمن
await storageService.removeSecureItem('accessToken');
```

### OAuth2 + Nafath

```javascript
// تسجيل الدخول عبر Nafath
const loginWithNafath = async () => {
  const result = await authService.nafathLogin({
    redirectUrl: 'saudilicense://callback',
  });

  if (result.success) {
    // حفظ التوكن
    await storageService.setSecureItem('accessToken', result.token);
  }
};
```

---

## 🧪 الاختبار والنشر

### الاختبارات

```bash
# اختبارات الوحدة
npm test

# اختبارات التكامل
npm run test:integration

# E2E Tests
npm run test:e2e
```

### بناء الإصدار (Build)

#### Android:

```bash
# Release Build
npm run build-android

# Generated APK:
# android/app/build/outputs/apk/release/app-release.apk

# Generated AAB (للـ Play Store):
# android/app/build/outputs/bundle/release/app-release.aab
```

#### iOS:

```bash
# Release Build
npm run build-ios

# Archive للـ App Store:
# يتم عبر Xcode
```

### النشر على المتاجر

#### Google Play Store:

1. إنشاء حساب Google Play Console
2. بناء AAB Release
3. رفع على المتجر
4. مراجعة وموافقة Google

#### Apple App Store:

1. إنشاء حساب Apple Developer
2. بناء Release في Xcode
3. إنشاء App في App Store Connect
4. رفع وتقديم للمراجعة

---

## 🔧 استكشاف الأخطاء

### مشاكل شائعة وحلولها

#### 1. خطأ في تثبيت المكتبات

```bash
# حل:
rm -rf node_modules ios/Pods package-lock.json
npm install
cd ios && pod install && cd ..
```

#### 2. محاكي Android لا يعمل

```bash
# حل:
emulator -list-avds
emulator -avd <AVD_NAME>
```

#### 3. مشاكل في البناء

```bash
# حل:
npm run clean
npm install
npm start -- --reset-cache
```

#### 4. مشاكل في المتصفح (Navigator)

```javascript
// تأكد من:
- استيراد الشاشات بشكل صحيح
- تعريف أسماء الشاشات
- إضافة params عند الحاجة
```

---

## 📞 الدعم والمساعدة

**القنوات الموصى بها:**

- 📧 البريد: support@license-system.sa
- 💬 الدردشة: support.license-system.sa
- 📞 الهاتف: 800-1234-567
- 🌐 الموقع: www.license-system.sa

---

## 📄 الترخيص

جميع الحقوق محفوظة © 2024 نظام إدارة الرخص السعودية

---

## 🙏 شكر خاص

شكر للفريق الرائع الذي عمل على هذا المشروع والمساهمين في تحسينه.

**تم الإعداد:** يناير 2026
**الإصدار:** v2.1.0 - Mobile First
**الحالة:** ✅ جاهز للإنتاج

---

**Made with ❤️ in Saudi Arabia**
