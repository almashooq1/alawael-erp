# AlAwael ERP - Frontend Vue 3

## 🎯 نظرة عامة

واجهة مستخدم حديثة مبنية بـ Vue 3 + Vite + Tailwind CSS لنظام AlAwael ERP.

## ✨ المميزات

- 🚀 **Vue 3** مع Composition API
- ⚡ **Vite** للتطوير والبناء السريع
- 🎨 **Tailwind CSS** للتصميم المتجاوب
- 🗂️ **Pinia** لإدارة الحالة
- 🔐 **JWT Authentication** مع تجديد تلقائي للتوكن
- 🌐 **RTL Support** دعم كامل للغة العربية
- 📊 **Dashboard** لوحة تحكم تفاعلية
- 👥 **User Management** إدارة المستخدمين
- 📱 **Responsive Design** تصميم متجاوب لجميع الأجهزة

## 📦 التثبيت

```bash
npm install
```

## 🚀 التشغيل

### وضع التطوير

```bash
npm run dev
```

الخادم سيعمل على: http://localhost:5173

### البناء للإنتاج

```bash
npm run build
```

### معاينة النسخة المبنية

```bash
npm run preview
```

## 📁 هيكل المشروع

```
frontend/
├── src/
│   ├── assets/          # CSS & Assets
│   │   └── main.css
│   ├── layouts/         # صفحات التخطيط
│   │   └── MainLayout.vue
│   ├── views/           # الصفحات الرئيسية
│   │   ├── LoginView.vue
│   │   ├── DashboardView.vue
│   │   ├── ProfileView.vue
│   │   ├── UsersView.vue
│   │   └── SettingsView.vue
│   ├── stores/          # Pinia Stores
│   │   └── auth.js
│   ├── services/        # API Services
│   │   └── api.js
│   ├── router/          # Vue Router
│   │   └── index.js
│   ├── App.vue          # Root Component
│   └── main.js          # Entry Point
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

## 🔐 المصادقة

النظام يستخدم JWT مع:

- Access Token (صالح لمدة 24 ساعة)
- Refresh Token (صالح لمدة 7 أيام)
- تجديد تلقائي للتوكن عند انتهاء الصلاحية

### بيانات تسجيل الدخول التجريبية:

```
📧 Email: admin@alawael.com
🔑 Password: Admin@123456
```

## 🎨 الصفحات المتاحة

### 1. صفحة تسجيل الدخول (`/login`)

- نموذج تسجيل دخول مع التحقق
- حفظ الجلسة (تذكرني)
- رسائل خطأ واضحة

### 2. لوحة التحكم (`/`)

- إحصائيات سريعة
- رسوم بيانية
- آخر النشاطات
- إجراءات سريعة

### 3. الملف الشخصي (`/profile`)

- تحديث المعلومات الشخصية
- تغيير كلمة المرور
- حذف الحساب

### 4. إدارة المستخدمين (`/users`) - للمديرين فقط

- عرض جميع المستخدمين
- إضافة/تعديل/حذف مستخدمين
- بحث وفلترة
- صفحات متعددة

### 5. الإعدادات (`/settings`)

- الإعدادات العامة
- معلومات النظام
- إعدادات API
- حول النظام

## 🛡️ الحماية

- حماية المسارات بـ Auth Guards
- تجديد تلقائي للتوكن
- Axios Interceptors
- Token Refresh Logic
- Role-based Access Control

## 🎨 Tailwind CSS

### الألوان المخصصة

```javascript
primary: {
  50: '#f0f9ff',
  100: '#e0f2fe',
  200: '#bae6fd',
  300: '#7dd3fc',
  400: '#38bdf8',
  500: '#0ea5e9', // الأساسي
  600: '#0284c7',
  700: '#0369a1',
  800: '#075985',
  900: '#0c4a6e'
}
```

### المكونات المخصصة

- `.btn` - أزرار عامة
- `.btn-primary` - زر أساسي
- `.btn-secondary` - زر ثانوي
- `.btn-danger` - زر خطر
- `.input` - حقول الإدخال
- `.card` - بطاقات
- `.table` - جداول
- `.badge` - شارات

## 🔄 إدارة الحالة (Pinia)

### Auth Store

```javascript
// تسجيل الدخول
await authStore.login(email, password);

// تسجيل الخروج
await authStore.logout();

// جلب الملف الشخصي
await authStore.fetchProfile();

// التحقق من المصادقة
await authStore.checkAuth();

// تحديث الملف الشخصي
await authStore.updateProfile({ fullName: 'اسم جديد' });

// تغيير كلمة المرور
await authStore.changePassword(currentPassword, newPassword);
```

## 🌐 API Integration

الـ API Service (`src/services/api.js`) مُكون مع:

- Base URL: `http://localhost:3001/api`
- Timeout: 10 ثواني
- Authorization Header تلقائي
- Auto Token Refresh على 401
- Error Handling

### استخدام API

```javascript
import api from '@/services/api';

// GET Request
const response = await api.get('/users');

// POST Request
await api.post('/users', { fullName, email, password });

// PUT Request
await api.put('/users/123', { fullName });

// DELETE Request
await api.delete('/users/123');
```

## 📱 التصميم المتجاوب

- **Desktop**: 1024px+
- **Tablet**: 768px - 1023px
- **Mobile**: < 768px

## 🌍 دعم اللغات

- العربية (RTL) - افتراضي
- الإنجليزية (LTR) - قريباً

## 📦 المكتبات المستخدمة

| المكتبة            | الإصدار    | الاستخدام        |
| ------------------ | ---------- | ---------------- |
| Vue                | 3.4.21     | Framework        |
| Vue Router         | 4.3.0      | Routing          |
| Pinia              | 2.1.7      | State Management |
| Axios              | 1.6.7      | HTTP Client      |
| Tailwind CSS       | 3.4.1      | Styling          |
| Chart.js           | 4.4.1      | Charts           |
| Vue Toastification | 2.0.0-rc.5 | Notifications    |
| Vite               | 5.1.4      | Build Tool       |

## 🔧 التكوين

### Environment Variables (`.env`)

```env
VITE_API_URL=http://localhost:3001/api
VITE_APP_TITLE=AlAwael ERP
```

## 🚀 Deploy

### Build

```bash
npm run build
```

الملفات المبنية ستكون في: `dist/`

### Deploy to Netlify

```bash
netlify deploy --dir=dist --prod
```

### Deploy to Vercel

```bash
vercel --prod
```

## 🐛 استكشاف الأخطاء

### الخادم لا يعمل

```bash
# تأكد من تثبيت المكتبات
npm install

# امسح node_modules وأعد التثبيت
rm -rf node_modules package-lock.json
npm install
```

### مشاكل API

- تأكد من تشغيل Backend على `http://localhost:3001`
- تحقق من CORS في Backend
- افحص Network Tab في Developer Tools

## 📄 الترخيص

MIT License

## 👨‍💻 المطور

فريق الأوائل - 2026

---

**ملاحظة:** هذا Frontend يتطلب Backend يعمل على `http://localhost:3001`
